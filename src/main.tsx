import "@fontsource/anton/400.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./styles/index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import { AccountProvider, BackendProvider } from "./data/context";
import { loadBackend } from "./data/loadBackend";

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root introuvable dans index.html");

const queryClient = new QueryClient({
  defaultOptions: {
    // Les données restent fraîches 30 s ; revenir sur l'onglet les relit (utile au coach).
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const backend = await loadBackend();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BackendProvider backend={backend}>
        <AccountProvider>
          <RouterProvider router={router} />
        </AccountProvider>
      </BackendProvider>
    </QueryClientProvider>
  </StrictMode>,
);
