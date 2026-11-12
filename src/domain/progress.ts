import { addDays, type IsoDate, mondayOf } from "./dates";
import { isPublication, type PlannedTask } from "./tasks";

/** Une journée compte dans la série à partir de 60 % de tâches faites. */
export const STREAK_THRESHOLD = 0.6;

/** Part des tâches faites un jour donné. null s'il n'y avait rien à faire. */
export function dayRatio(tasks: readonly PlannedTask[], done: ReadonlySet<string>): number | null {
  if (tasks.length === 0) return null;
  return tasks.filter((task) => done.has(task.id)).length / tasks.length;
}

/**
 * Série : nombre de jours consécutifs à 60 % ou plus, en remontant depuis aujourd'hui.
 * Un jour sans tâche ne casse pas la série. Aujourd'hui ne la casse pas non plus tant
 * qu'il n'est pas fini : s'il est encore sous le seuil, on part d'hier.
 */
export function streak(
  today: IsoDate,
  start: IsoDate,
  ratioOf: (date: IsoDate) => number | null,
): number {
  const todayRatio = ratioOf(today);
  let date = todayRatio === null || todayRatio < STREAK_THRESHOLD ? addDays(today, -1) : today;
  let count = 0;

  while (date >= start) {
    const ratio = ratioOf(date);
    if (ratio !== null && ratio < STREAK_THRESHOLD) break;
    if (ratio !== null) count += 1;
    date = addDays(date, -1);
  }
  return count;
}

export interface Publications {
  done: number;
  planned: number;
}

/** Reels et réels d'essai faits et prévus sur la semaine (lundi à dimanche) qui contient `date`. */
export function weekPublications(
  date: IsoDate,
  tasksOn: (day: IsoDate) => readonly PlannedTask[],
  doneOn: (day: IsoDate) => ReadonlySet<string>,
): Publications {
  const monday = mondayOf(date);
  let done = 0;
  let planned = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(monday, offset);
    const publications = tasksOn(day).filter(isPublication);
    const doneThatDay = doneOn(day);
    planned += publications.length;
    done += publications.filter((task) => doneThatDay.has(task.id)).length;
  }
  return { done, planned };
}

/** Les `count` derniers jours, du plus ancien au plus récent, aujourd'hui compris. */
export function lastDays(today: IsoDate, count: number): IsoDate[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
}

export interface Completion {
  done: number;
  total: number;
}

/** Tâches faites et prévues sur une liste de jours. */
export function completionOver(
  days: readonly IsoDate[],
  tasksOn: (day: IsoDate) => readonly PlannedTask[],
  doneOn: (day: IsoDate) => ReadonlySet<string>,
): Completion {
  let done = 0;
  let total = 0;
  for (const day of days) {
    const tasks = tasksOn(day);
    const doneThatDay = doneOn(day);
    total += tasks.length;
    done += tasks.filter((task) => doneThatDay.has(task.id)).length;
  }
  return { done, total };
}

/** Au-delà de ce nombre de jours sans activité, le coach est invité à relancer. */
export const INACTIVITY_ALERT_DAYS = 3;
