import type { Backend } from "./backend";

/**
 * Choisit le backend au démarrage. Vite remplace VITE_BACKEND à la construction :
 * la version en mémoire n'est donc pas embarquée dans le site en production.
 */
export async function loadBackend(): Promise<Backend> {
  if (import.meta.env.VITE_BACKEND === "memory") {
    const { createMemoryBackend } = await import("./memoryBackend");
    return createMemoryBackend();
  }
  const { createSupabaseBackend } = await import("./supabaseBackend");
  return createSupabaseBackend();
}
