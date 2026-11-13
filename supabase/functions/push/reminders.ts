import { taches } from "../../../content/complement.json";
import { programme } from "../../../content/contenu.json";
import {
  addDays,
  diffDays,
  hourInParis,
  type IsoDate,
  todayInParis,
} from "../../../src/domain/dates";
import { dayNumber, phaseOn, type PhaseOverride } from "../../../src/domain/phases";
import { isPublication, type PlannedTask, plannedTasks } from "../../../src/domain/tasks";

/**
 * Les rappels envoyés au créateur. Trois au plus, jamais plus de deux le même jour :
 * - matin : la to-do du jour, avec une relance s'il n'a rien saisi depuis 2 jours ;
 * - publication : en fin d'après-midi, s'il reste une publication à cocher ;
 * - montage : le dimanche, si la session de montage n'est pas cochée.
 * Les règles de la to-do sont celles du site (src/domain) : un seul endroit les décide.
 */

export type ReminderKind = "matin" | "publication" | "montage";

export interface Reminder {
  kind: ReminderKind;
  /** Le jour, à Paris, pour lequel le rappel vaut : il ne part qu'une fois ce jour-là. */
  day: IsoDate;
  title: string;
  body: string;
}

/** Ce qu'il faut savoir du créateur pour décider de ses rappels. */
export interface CreatorState {
  override: PhaseOverride | null;
  /** Tâches cochées aujourd'hui. */
  doneToday: readonly string[];
  /** Jour de sa dernière saisie. null s'il n'a encore rien saisi. */
  lastActivityDay: IsoDate | null;
}

/**
 * Heures de Paris pendant lesquelles chaque rappel peut partir. La fenêtre dure 3 heures :
 * si un passage de l'horloge est manqué, le suivant rattrape, mais un rappel du matin
 * ne part jamais le soir.
 */
const WINDOW_HOURS = 3;
const startHour: Record<ReminderKind, number> = { matin: 8, montage: 17, publication: 18 };

/** Jours pleins sans aucune saisie à partir desquels le rappel du matin devient une relance. */
export const SILENT_DAYS_BEFORE_NUDGE = 2;

const MONTAGE_TASK = "edit";
const KIT_TASK = "kit";

function inWindow(kind: ReminderKind, hour: number): boolean {
  return hour >= startHour[kind] && hour < startHour[kind] + WINDOW_HOURS;
}

/** Vrai si au moins un rappel peut partir à cette heure : sinon, inutile de lire la base. */
export function isReminderHour(now: Date): boolean {
  const hour = hourInParis(now);
  return (Object.keys(startHour) as ReminderKind[]).some((kind) => inWindow(kind, hour));
}

function titleOf(task: PlannedTask): string {
  const title = taches[task.id].titre;
  // Le titre suit deux-points dans la phrase : il perd sa majuscule.
  return title.charAt(0).toLowerCase() + title.slice(1);
}

function countTasks(count: number): string {
  return count > 1 ? `${count} tâches` : "1 tâche";
}

/** La tâche à mettre en avant : la publication du jour, sinon la première après le kit quotidien. */
function highlight(tasks: readonly PlannedTask[]): PlannedTask | undefined {
  return tasks.find(isPublication) ?? tasks.find((task) => task.id !== KIT_TASK) ?? tasks[0];
}

/** Jours pleins sans saisie avant aujourd'hui, comptés depuis le lancement au plus tôt. */
function silentDays(today: IsoDate, lastActivityDay: IsoDate | null): number {
  const dayBeforeLaunch = addDays(programme.debut, -1);
  const since =
    lastActivityDay && lastActivityDay > dayBeforeLaunch ? lastActivityDay : dayBeforeLaunch;
  return Math.max(0, diffDays(since, today) - 1);
}

function morning(today: IsoDate, tasks: readonly PlannedTask[], state: CreatorState): Reminder {
  const first = highlight(tasks);
  const focus = first ? titleOf(first) : "";
  const silent = silentDays(today, state.lastActivityDay);

  if (silent >= SILENT_DAYS_BEFORE_NUDGE) {
    return {
      kind: "matin",
      day: today,
      title: "On reprend aujourd'hui ?",
      body: `${silent} jours sans rien cocher. ${countTasks(tasks.length)} t'attendent, à commencer par : ${focus}.`,
    };
  }
  return {
    kind: "matin",
    day: today,
    title: `Jour ${dayNumber(programme.debut, today)} : ta to-do est prête`,
    body: `${countTasks(tasks.length)} aujourd'hui. À ne pas rater : ${focus}.`,
  };
}

/** Les rappels à envoyer maintenant. Qu'ils soient déjà partis aujourd'hui se vérifie ailleurs. */
export function dueReminders(now: Date, state: CreatorState): Reminder[] {
  const today = todayInParis(now);
  const hour = hourInParis(now);
  const phase = phaseOn(programme.phases, today, state.override);
  const tasks = plannedTasks(today, programme.debut, phase);
  if (tasks.length === 0) return [];

  const done = new Set(state.doneToday);
  const reminders: Reminder[] = [];

  if (inWindow("matin", hour)) reminders.push(morning(today, tasks, state));

  const toPublish = tasks.filter((task) => isPublication(task) && !done.has(task.id));
  if (inWindow("publication", hour) && toPublish.length > 0) {
    reminders.push({
      kind: "publication",
      day: today,
      title: "Pas encore publié ?",
      body: `À faire avant ce soir : ${toPublish.map(titleOf).join(", ")}. Coche la case une fois en ligne.`,
    });
  }

  const montagePending = tasks.some((task) => task.id === MONTAGE_TASK) && !done.has(MONTAGE_TASK);
  if (inWindow("montage", hour) && montagePending) {
    reminders.push({
      kind: "montage",
      day: today,
      title: "Le montage de la semaine t'attend",
      body: "Une heure suffit pour préparer tes reels de la semaine. Coche la case quand c'est fait.",
    });
  }

  return reminders;
}
