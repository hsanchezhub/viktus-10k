import { diffDays, type IsoDate } from "./dates";

export interface TargetPoint {
  date: IsoDate;
  abonnes: number;
}

/**
 * L'objectif d'abonnés à une date : interpolation linéaire entre les points de la trajectoire,
 * arrondie à l'unité. Avant le premier point ou après le dernier, on garde leur valeur.
 */
export function targetAt(date: IsoDate, trajectory: readonly TargetPoint[]): number {
  const first = trajectory[0];
  const last = trajectory.at(-1);
  if (!first || !last) throw new Error("La trajectoire objectif est vide");
  if (date <= first.date) return first.abonnes;

  for (let index = 1; index < trajectory.length; index += 1) {
    const from = trajectory[index - 1];
    const to = trajectory[index];
    if (from && to && date <= to.date) {
      const share = diffDays(from.date, date) / diffDays(from.date, to.date);
      return Math.round(from.abonnes + (to.abonnes - from.abonnes) * share);
    }
  }
  return last.abonnes;
}

/** Un hook gagne si ses vues à 72 h atteignent 2 fois la médiane récente du compte. */
export function winningViews(recentMedian: number): number {
  return recentMedian * 2;
}

export function isWinningHook(views: number | null, recentMedian: number): boolean {
  return views !== null && views >= winningViews(recentMedian);
}
