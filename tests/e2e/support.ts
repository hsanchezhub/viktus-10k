import type { Page } from "@playwright/test";

// Les parcours tournent sur le backend en mémoire (VITE_BACKEND=memory) : aucun appel à Supabase.
// Son état vit dans localStorage, sous cette clé (la même que dans src/data/memoryBackend.ts).
const DEMO_STORAGE_KEY = "viktus:demo";

/** Mot de passe des comptes de test. Il ne sert qu'au backend en mémoire, dans le navigateur de test. */
export const TEST_PASSWORD = "motdepasse-de-test";

export const victor = {
  id: "demo-creator",
  email: "victor@demo.test",
  password: TEST_PASSWORD,
  role: "creator",
  displayName: "Victor",
};
export const hugo = {
  id: "demo-coach",
  email: "hugo@demo.test",
  password: TEST_PASSWORD,
  role: "coach",
  displayName: "Hugo",
};

export interface DemoTracking {
  days?: Record<string, string[]>;
  firsts?: Record<string, string>;
  followers?: Record<string, number>;
  hooks?: Array<{
    id: string;
    day: string;
    kind: "reel" | "essai" | "carrousel";
    hook: string;
    views: number | null;
    shares: number | null;
    follows: number | null;
  }>;
}

/**
 * Ouvre le site avec les deux comptes déjà créés et `as` connecté.
 * L'état n'est posé qu'une fois : un rechargement de page garde ce que le test a modifié.
 */
export async function signedIn(
  page: Page,
  as: "creator" | "coach" = "creator",
  tracking: DemoTracking = {},
) {
  const state = {
    invitations: [],
    users: [victor, hugo],
    sessionUserId: as === "creator" ? victor.id : hugo.id,
    tracking: { days: {}, firsts: {}, followers: {}, hooks: [], ...tracking },
  };
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    [DEMO_STORAGE_KEY, JSON.stringify(state)] as const,
  );
}

/** Fige la date du navigateur : les écrans dépendent du jour qu'il est à Paris. */
export async function onDay(page: Page, day: string) {
  await page.clock.setFixedTime(new Date(`${day}T09:00:00+01:00`));
}

export function sectionLink(page: Page, name: string) {
  // La barre d'onglets (téléphone) et le rail (ordinateur) portent le même nom ; une seule est visible.
  return page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name });
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}
