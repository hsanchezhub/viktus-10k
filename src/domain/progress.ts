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
