import { dayOfMonth, type IsoDate, weekdayOf } from "./dates";
import { weekOf } from "./phases";

export const taskIds = [
  "kit",
  "post_tue",
  "post_wed",
  "trial_wed",
  "post_thu",
  "mep",
  "facecam",
  "trial_fri",
  "post_sat",
  "carousel",
  "stories",
  "reply",
  "source",
  "edit",
  "log",
  "followers",
  "story_mon",
  "sell",
  "review",
] as const;
export type TaskId = (typeof taskIds)[number];

/** routine : geste du quotidien. post, trial, carousel : une publication. */
export type TaskKind = "routine" | "post" | "trial" | "carousel";

export interface PlannedTask {
  id: TaskId;
  kind: TaskKind;
}

const MONDAY = 1;
const TUESDAY = 2;
const WEDNESDAY = 3;
const THURSDAY = 4;
const FRIDAY = 5;
const SATURDAY = 6;
const SUNDAY = 0;

const SALES_DAYS = [5, 20];

/**
 * La to-do d'un jour, dans l'ordre d'affichage. Elle dépend du jour de la semaine,
 * de la phase qui vaut ce jour-là et du numéro de semaine du programme.
 * Reprend à l'identique la règle du prototype (fonction tasksFor).
 */
export function plannedTasks(date: IsoDate, start: IsoDate, phase: number): PlannedTask[] {
  if (date < start) return [];

  const weekday = weekdayOf(date);
  const week = weekOf(start, date);
  const atTheSalon = weekday >= TUESDAY && weekday <= SATURDAY;
  const tasks: PlannedTask[] = [];
  const add = (id: TaskId, kind: TaskKind = "routine") => tasks.push({ id, kind });

  if (atTheSalon) add("kit");

  if (weekday === TUESDAY) add("post_tue", "post");

  if (weekday === WEDNESDAY) {
    if (phase >= 3) add("post_wed", "post");
    if (week >= 2) add("trial_wed", "trial");
  }

  if (weekday === THURSDAY) {
    add("post_thu", "post");
    add("mep");
  }

  if (weekday === FRIDAY) {
    add("facecam");
    if (phase >= 2) add("trial_fri", "trial");
  }

  if (weekday === SATURDAY) {
    add("post_sat", "post");
    // Carrousel une semaine sur deux en phase 2, chaque samedi ensuite.
    if (phase >= 3 || (phase === 2 && week % 2 === 0)) add("carousel", "carousel");
  }

  if (atTheSalon) {
    add("stories");
    add("reply");
    add("source");
  }

  if (weekday === SUNDAY) {
    add("edit");
    add("log");
  }

  if (weekday === MONDAY) {
    add("followers");
    add("story_mon");
  }

  if (SALES_DAYS.includes(dayOfMonth(date))) add("sell", "post");
  if (dayOfMonth(date) === 1) add("review");

  return tasks;
}

/** Une publication qui compte dans « publications de la semaine » : reels et réels d'essai. */
export function isPublication(task: PlannedTask): boolean {
  return task.kind === "post" || task.kind === "trial";
}
