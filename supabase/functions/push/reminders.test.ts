import { describe, expect, it } from "vitest";
import { type CreatorState, dueReminders, isReminderHour } from "./reminders";

/** Un instant à Paris en hiver (UTC+1) : « 2026-11-17 08:00 ». */
const paris = (day: string, hour: number) =>
  new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+01:00`);

const active = (lastActivityDay: string, doneToday: string[] = []): CreatorState => ({
  override: null,
  doneToday,
  lastActivityDay,
});

const kinds = (now: Date, state: CreatorState) => dueReminders(now, state).map((r) => r.kind);

describe("rappel du matin", () => {
  it("annonce la to-do et met la publication du jour en avant", () => {
    // Mardi 17 nov. 2026, jour 2 : kit, reel Transfo, stories, réponses, question aux clients.
    const [reminder] = dueReminders(paris("2026-11-17", 8), active("2026-11-16"));
    expect(reminder).toEqual({
      kind: "matin",
      day: "2026-11-17",
      title: "Jour 2 : ta to-do est prête",
      body: "5 tâches aujourd'hui. À ne pas rater : publier le reel Transfo.",
    });
  });

  it("met en avant le geste du jour quand il n'y a rien à publier", () => {
    // Vendredi, phase 1 : le face caméra passe devant le kit quotidien.
    expect(dueReminders(paris("2026-11-27", 8), active("2026-11-26"))[0]?.body).toBe(
      "5 tâches aujourd'hui. À ne pas rater : filmer 30 s face caméra pour le Défi 10K.",
    );
    // Le 20 du mois est un jour de vente : c'est lui qui passe devant.
    expect(dueReminders(paris("2026-11-20", 8), active("2026-11-19"))[0]?.body).toBe(
      "6 tâches aujourd'hui. À ne pas rater : jour de vente : « il reste X créneaux ».",
    );
    // Lundi : relever ses abonnés.
    expect(dueReminders(paris("2026-11-16", 8), active("2026-11-15"))[0]?.body).toBe(
      "2 tâches aujourd'hui. À ne pas rater : relever ton nombre d'abonnés dans Suivi.",
    );
  });

  it("devient une relance après 2 jours pleins sans rien saisir", () => {
    // Dernière saisie lundi 16 : mardi et mercredi sans rien, relance jeudi matin.
    expect(dueReminders(paris("2026-11-18", 8), active("2026-11-16"))[0]?.title).toBe(
      "Jour 3 : ta to-do est prête",
    );
    expect(dueReminders(paris("2026-11-19", 8), active("2026-11-16"))[0]).toEqual({
      kind: "matin",
      day: "2026-11-19",
      title: "On reprend aujourd'hui ?",
      body: "2 jours sans rien cocher. 6 tâches t'attendent, à commencer par : publier le reel Interaction ou Émotion.",
    });
  });

  it("compte le silence depuis le lancement pour qui n'a encore rien saisi", () => {
    const never: CreatorState = { override: null, doneToday: [], lastActivityDay: null };
    expect(dueReminders(paris("2026-11-16", 8), never)[0]?.title).toBe(
      "Jour 1 : ta to-do est prête",
    );
    expect(dueReminders(paris("2026-11-18", 8), never)[0]?.title).toBe("On reprend aujourd'hui ?");
    // Une saisie d'avant le lancement ne compte pas comme du silence en plus.
    expect(dueReminders(paris("2026-11-17", 8), active("2026-11-12"))[0]?.title).toBe(
      "Jour 2 : ta to-do est prête",
    );
  });

  it("ne part qu'entre 8 h et 11 h, et jamais avant le lancement", () => {
    expect(kinds(paris("2026-11-17", 7), active("2026-11-16"))).toEqual([]);
    expect(kinds(paris("2026-11-17", 10), active("2026-11-16"))).toEqual(["matin"]);
    expect(kinds(paris("2026-11-17", 11), active("2026-11-16"))).toEqual([]);
    expect(kinds(paris("2026-11-15", 8), active("2026-11-14"))).toEqual([]);
  });
});

describe("rappel de publication", () => {
  it("part à 18 h s'il reste une publication à cocher", () => {
    expect(dueReminders(paris("2026-11-17", 18), active("2026-11-17", ["kit"]))).toEqual([
      {
        kind: "publication",
        day: "2026-11-17",
        title: "Pas encore publié ?",
        body: "À faire avant ce soir : publier le reel Transfo. Coche la case une fois en ligne.",
      },
    ]);
  });

  it("ne part pas si la publication est cochée, ni les jours sans publication", () => {
    expect(kinds(paris("2026-11-17", 18), active("2026-11-17", ["post_tue"]))).toEqual([]);
    expect(kinds(paris("2026-11-16", 18), active("2026-11-16"))).toEqual([]);
  });

  it("suit la phase forcée par le coach", () => {
    // Mercredi de la semaine 1 : rien à publier en phase 1, un reel en phase 3.
    const forced: CreatorState = {
      ...active("2026-11-18"),
      override: { phase: 3, from: "2026-11-18" },
    };
    expect(kinds(paris("2026-11-18", 18), active("2026-11-18"))).toEqual([]);
    expect(dueReminders(paris("2026-11-18", 18), forced)[0]?.body).toContain("publier un reel");
  });
});

describe("rappel de montage", () => {
  it("part le dimanche à 17 h tant que la session n'est pas cochée", () => {
    expect(kinds(paris("2026-11-22", 17), active("2026-11-22"))).toEqual(["montage"]);
    expect(kinds(paris("2026-11-22", 17), active("2026-11-22", ["edit"]))).toEqual([]);
    expect(kinds(paris("2026-11-21", 17), active("2026-11-21"))).toEqual([]);
  });
});

describe("isReminderHour", () => {
  it("dit si un rappel peut partir à cette heure, été comme hiver", () => {
    expect(isReminderHour(paris("2026-11-17", 8))).toBe(true);
    expect(isReminderHour(paris("2026-11-17", 20))).toBe(true);
    expect(isReminderHour(paris("2026-11-17", 12))).toBe(false);
    expect(isReminderHour(paris("2026-11-17", 21))).toBe(false);
    // 8 h à Paris en été, c'est 6 h UTC.
    expect(isReminderHour(new Date("2027-07-06T06:00:00Z"))).toBe(true);
  });
});
