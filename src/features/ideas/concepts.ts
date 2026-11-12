import { type GoalKey, goalKeys } from "../../content/goals";
import type { Concept } from "../../content/schema";

/** Tous les concepts, un but précis, ou les réels d'essai. */
export type IdeaFilter = "all" | GoalKey | "ess";

/** Lit le filtre dans l'adresse. Une valeur inconnue retombe sur « tous ». */
export function parseFilter(raw: string | null): IdeaFilter {
  if (raw === "ess") return "ess";
  return goalKeys.find((key) => key === raw) ?? "all";
}

export function isAvailable(concept: Concept, currentPhase: number): boolean {
  return concept.desLaPhase <= currentPhase;
}

/**
 * Les concepts d'un but, ceux déjà disponibles en premier, puis par phase d'ouverture.
 * À phase égale, l'ordre du fichier de contenu est conservé.
 */
export function conceptsFor(
  concepts: readonly Concept[],
  goal: "all" | GoalKey,
  currentPhase: number,
): Concept[] {
  return concepts
    .filter((concept) => goal === "all" || concept.but === goal)
    .toSorted(
      (a, b) =>
        Number(!isAvailable(a, currentPhase)) - Number(!isAvailable(b, currentPhase)) ||
        a.desLaPhase - b.desLaPhase,
    );
}

/** « Il m'a dit » sans ses guillemets, pour coller le hook tel quel dans un montage. */
export function stripQuotes(hook: string): string {
  return hook.replace(/[«»]/g, "").trim();
}
