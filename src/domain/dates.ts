/**
 * Un jour calendaire à Paris, au format AAAA-MM-JJ.
 * Deux dates de ce format se comparent directement avec < et >.
 */
export type IsoDate = string;

const DAY_MS = 86_400_000;

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const;

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;

const parisParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Le jour qu'il est à Paris, quel que soit le fuseau de l'appareil. */
export function todayInParis(now: Date = new Date()): IsoDate {
  const parts = parisParts.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function splitIso(date: IsoDate): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Date invalide : ${date}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

// Les calculs se font en UTC : un jour calendaire n'a alors ni heure d'été ni fuseau.
function toUtc(date: IsoDate): number {
  const { year, month, day } = splitIso(date);
  return Date.UTC(year, month - 1, day);
}

export function isIsoDate(value: string): value is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtc(value));
}

export function addDays(date: IsoDate, count: number): IsoDate {
  return new Date(toUtc(date) + count * DAY_MS).toISOString().slice(0, 10);
}

/** Nombre de jours de `from` à `to` (négatif si `to` est avant). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** 0 = dimanche, 1 = lundi, ... 6 = samedi. */
export function weekdayOf(date: IsoDate): number {
  return new Date(toUtc(date)).getUTCDay();
}

export function dayOfMonth(date: IsoDate): number {
  return splitIso(date).day;
}

export function yearOf(date: IsoDate): number {
  return splitIso(date).year;
}

/** Le lundi de la semaine qui contient cette date. */
export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

/** « 16 nov. » */
export function formatShort(date: IsoDate): string {
  const { month, day } = splitIso(date);
  return `${day} ${MONTHS[month - 1] ?? ""}`;
}

/** « lundi 16 nov. » */
export function formatLong(date: IsoDate): string {
  return `${WEEKDAYS[weekdayOf(date)] ?? ""} ${formatShort(date)}`;
}

/** « nov. », pour les axes de la courbe. */
export function monthLabel(date: IsoDate): string {
  return MONTHS[splitIso(date).month - 1] ?? "";
}
