/** Ce que le service worker annonce aux pages ouvertes (voir service-worker/sw.js). */
interface WorkerMessage {
  source: "viktus";
  kind: "push" | "open";
}

function isWorkerMessage(data: unknown): data is WorkerMessage {
  const message = data as Partial<WorkerMessage> | null;
  return message?.source === "viktus" && (message.kind === "push" || message.kind === "open");
}

interface WorkerEvents {
  /** Une notification vient d'arriver pendant que le site est ouvert. */
  onPush: () => void;
  /** L'utilisateur a touché une notification : le site déjà ouvert revient au premier plan. */
  onOpen: () => void;
}

export function supportsServiceWorker(): boolean {
  return "serviceWorker" in navigator;
}

/**
 * Installe le service worker : le site s'ouvre ensuite sans réseau et peut recevoir des
 * notifications. Seulement sur le site construit : en développement, il gênerait le
 * rechargement à chaud.
 */
export function registerServiceWorker({ onPush, onOpen }: WorkerEvents): void {
  if (!import.meta.env.PROD || !supportsServiceWorker()) return;

  const { serviceWorker } = navigator;
  const scope = import.meta.env.BASE_URL;

  serviceWorker
    .register(`${scope}sw.js`, { scope })
    .then((registration) => {
      // Le site reste ouvert des jours sur un écran d'accueil : on cherche une nouvelle
      // version à chaque retour dessus. Elle s'appliquera à la prochaine ouverture.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void registration.update().catch(() => {});
      });
    })
    // Sans service worker le site marche quand même, en ligne seulement.
    .catch(() => {});

  serviceWorker.addEventListener("message", (event) => {
    if (!isWorkerMessage(event.data)) return;
    if (event.data.kind === "push") onPush();
    else onOpen();
  });
}
