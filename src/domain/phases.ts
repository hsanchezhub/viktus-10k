import { diffDays, type IsoDate } from "./dates";

interface PhaseWindow {
  n: number;
  to: IsoDate;
}

/** Le coach a forcé une phase : elle s'applique à partir de `from`, sans toucher aux jours d'avant. */
export interface PhaseOverride {
  phase: number;
  from: IsoDate;
}

/** La phase prévue par le calendrier à une date donnée. Après la dernière phase, on y reste. */
export function phaseNumberAt(phases: readonly PhaseWindow[], date: IsoDate): number {
  const last = phases.at(-1);
  if (!last) throw new Error("Le programme n'a aucune phase");
  return phases.find((phase) => date <= phase.to)?.n ?? last.n;
}

/** La phase qui vaut pour un jour donné : celle forcée par le coach si elle court déjà, sinon le calendrier. */
export function phaseOn(
  phases: readonly PhaseWindow[],
  date: IsoDate,
  override: PhaseOverride | null = null,
): number {
  if (override && date >= override.from) return override.phase;
  return phaseNumberAt(phases, date);
}

/** La phase à afficher aujourd'hui. Avant le début du programme, on montre déjà la première. */
export function currentPhaseNumber(
  phases: readonly PhaseWindow[],
  start: IsoDate,
  today: IsoDate,
  override: PhaseOverride | null = null,
): number {
  return phaseOn(phases, today < start ? start : today, override);
}

export function phaseByNumber<T extends { n: number }>(phases: readonly T[], n: number): T {
  const phase = phases.find((candidate) => candidate.n === n);
  if (!phase) throw new Error(`Phase ${n} introuvable`);
  return phase;
}

/** Numéro de semaine du programme : 1 pour les 7 premiers jours, 0 avant le début. */
export function weekOf(start: IsoDate, date: IsoDate): number {
  return date < start ? 0 : Math.floor(diffDays(start, date) / 7) + 1;
}

/** Numéro du jour dans le programme : 1 le jour du lancement, 0 avant. */
export function dayNumber(start: IsoDate, date: IsoDate): number {
  return date < start ? 0 : diffDays(start, date) + 1;
}

/** Part du chemin parcouru entre deux paliers d'abonnés, bornée entre 0 et 1. */
export function goalProgress(followers: number, [from, to]: readonly [number, number]): number {
  if (to <= from) return 0;
  return Math.min(1, Math.max(0, (followers - from) / (to - from)));
}
