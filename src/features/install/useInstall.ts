import { useCallback, useEffect, useState } from "react";

/** Événement de Chrome et d'Android : le navigateur propose lui-même l'installation. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

/** Vrai si le site tourne depuis l'écran d'accueil, comme une appli. */
export function isOnHomeScreen(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

interface InstallState {
  /** Le site tourne déjà depuis l'écran d'accueil : inutile de proposer l'installation. */
  installed: boolean;
  /** Ouvre la fenêtre d'installation du navigateur. Null sur iPhone, où il faut passer par Partager. */
  promptNative: (() => Promise<void>) | null;
}

export function useInstall(): InstallState {
  const [installed, setInstalled] = useState(isOnHomeScreen);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptNative = useCallback(async () => {
    await promptEvent?.prompt();
    // Le navigateur n'accepte qu'un seul appel par événement.
    setPromptEvent(null);
  }, [promptEvent]);

  return { installed, promptNative: promptEvent ? promptNative : null };
}
