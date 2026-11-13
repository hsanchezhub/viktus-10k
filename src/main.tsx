import "@fontsource/anton/400.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./styles/index.css";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { defaultShouldDehydrateQuery, onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import { HOME_PATH } from "./app/sections";
import { AccountProvider, BackendProvider } from "./data/context";
import { loadBackend } from "./data/loadBackend";
import { DEVICE_QUERY } from "./features/notifications/usePush";
import { registerTrackingWrites, reloadMessages } from "./data/queries";
import { registerServiceWorker } from "./lib/serviceWorker";

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root introuvable dans index.html");

const WEEK_MS = 7 * 86_400_000;
/** À changer quand la forme des données gardées change : l'ancienne copie est alors jetée. */
const CACHE_VERSION = "1";

const queryClient = new QueryClient({
  defaultOptions: {
    // Les données restent fraîches 30 s ; revenir sur l'onglet les relit (utile au coach).
    // Elles sont gardées une semaine sur l'appareil, pour s'afficher sans réseau.
    queries: { staleTime: 30_000, retry: 1, gcTime: WEEK_MS },
  },
});

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    // Stockage refusé (navigation privée stricte) : le site marche, sans copie hors ligne.
    return undefined;
  }
}

// Par défaut, le site se croit en ligne tant que le navigateur n'annonce pas un changement.
// Ouvert sans réseau, il doit le savoir tout de suite : les envois attendent au lieu d'échouer.
onlineManager.setOnline(navigator.onLine);

const persister = createSyncStoragePersister({ storage: browserStorage(), key: "viktus:cache" });

const backend = await loadBackend();
registerTrackingWrites(queryClient, backend);
// À la déconnexion, rien du compte ne reste sur l'appareil.
backend.onAccountChange((account) => {
  if (!account) queryClient.clear();
});
registerServiceWorker({
  onPush: () => void reloadMessages(queryClient),
  // Une notification touchée ramène sur l'accueil, où s'affiche le message du coach.
  onOpen: () => {
    void reloadMessages(queryClient);
    void router.navigate(HOME_PATH);
  },
});

/** La copie locale est relue : on envoie ce qui attendait le réseau, puis on relit le serveur. */
function resumePendingWrites() {
  void queryClient.resumePausedMutations().then(() => queryClient.invalidateQueries());
}

createRoot(root).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: WEEK_MS,
        buster: CACHE_VERSION,
        dehydrateOptions: {
          // L'état de l'appareil (notifications) se relit à chaque ouverture, il ne se garde pas.
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) && query.queryKey[0] !== DEVICE_QUERY,
        },
      }}
      onSuccess={resumePendingWrites}
    >
      <BackendProvider backend={backend}>
        <AccountProvider>
          <RouterProvider router={router} />
        </AccountProvider>
      </BackendProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
