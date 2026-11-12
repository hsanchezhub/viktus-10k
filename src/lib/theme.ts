import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

// La même clé est lue par le script de index.html, avant le premier rendu.
const STORAGE_KEY = "viktus:theme";
const BROWSER_BAR_COLOR: Record<Theme, string> = { dark: "#131217", light: "#f6f4f8" };

const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", BROWSER_BAR_COLOR[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible (navigation privée) : le thème tient jusqu'au rechargement.
  }
  listeners.forEach((listener) => listener());
}

/** Le thème affiché. Sombre par défaut, clair si l'utilisateur l'a choisi. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme);
}
