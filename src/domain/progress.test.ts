import { describe, expect, it } from "vitest";
import { contenu } from "../content";
import { addDays } from "./dates";
import { phaseNumberAt } from "./phases";
import { completionOver, dayRatio, lastDays, streak, weekPublications } from "./progress";
import { plannedTasks } from "./tasks";
import { isWinningHook, targetAt } from "./target";

const { phases, debut, trajectoireObjectif, audit } = contenu.programme;
const tasksOn = (date: string) => plannedTasks(date, debut, phaseNumberAt(phases, date));

/** Fabrique un carnet de journées : pour chaque date, la part de tâches cochées. */
function journal(ratios: Record<string, number>) {
  const doneOn = (date: string) => {
    const tasks = tasksOn(date);
    const count = Math.round((ratios[date] ?? 0) * tasks.length);
    return new Set(tasks.slice(0, count).map((task) => task.id as string));
  };
  return { doneOn, ratioOf: (date: string) => dayRatio(tasksOn(date), doneOn(date)) };
}

describe("dayRatio", () => {
  it("vaut null un jour sans tâche", () => {
    expect(dayRatio([], new Set())).toBeNull();
  });

  it("compte la part de tâches cochées", () => {
    const tasks = tasksOn("2026-11-17"); // mardi : 5 tâches
    expect(dayRatio(tasks, new Set(["kit", "post_tue", "stories"]))).toBeCloseTo(0.6);
  });
});

describe("streak", () => {
  it("compte les jours consécutifs à 60 % ou plus", () => {
    const { ratioOf } = journal({ "2026-11-16": 1, "2026-11-17": 0.6, "2026-11-18": 1 });
    expect(streak("2026-11-18", debut, ratioOf)).toBe(3);
  });

  it("ne casse pas la série tant qu'aujourd'hui n'est pas fini", () => {
    const { ratioOf } = journal({ "2026-11-16": 1, "2026-11-17": 1, "2026-11-18": 0.25 });
    expect(streak("2026-11-18", debut, ratioOf)).toBe(2);
  });

  it("s'arrête au premier jour raté", () => {
    const { ratioOf } = journal({ "2026-11-16": 1, "2026-11-17": 0.2, "2026-11-18": 1 });
    expect(streak("2026-11-18", debut, ratioOf)).toBe(1);
  });

  it("vaut 0 avant le lancement", () => {
    const { ratioOf } = journal({});
    expect(streak("2026-11-12", debut, ratioOf)).toBe(0);
  });

  it("ne remonte pas avant le début du programme", () => {
    const { ratioOf } = journal({ "2026-11-16": 1 });
    expect(streak("2026-11-16", debut, ratioOf)).toBe(1);
  });
});

describe("weekPublications", () => {
  it("compte les reels et réels d'essai de la semaine, du lundi au dimanche", () => {
    // Semaine 2 (23 au 29 novembre) : mardi, mercredi (essai), jeudi, samedi.
    const { doneOn } = journal({ "2026-11-24": 1, "2026-11-25": 1 });
    expect(weekPublications("2026-11-26", tasksOn, doneOn)).toEqual({ done: 2, planned: 4 });
  });

  it("compte aussi le jour de vente", () => {
    // Semaine 1 : mardi, jeudi, vendredi 20 (vente), samedi.
    const { doneOn } = journal({});
    expect(weekPublications("2026-11-16", tasksOn, doneOn).planned).toBe(4);
  });
});

describe("targetAt", () => {
  it("passe par les points de la trajectoire", () => {
    expect(targetAt("2026-11-12", trajectoireObjectif)).toBe(645);
    expect(targetAt("2026-12-31", trajectoireObjectif)).toBe(1000);
    expect(targetAt("2027-08-31", trajectoireObjectif)).toBe(10000);
  });

  it("interpole entre deux points et arrondit", () => {
    // Du 12 novembre (645) au 31 décembre (1 000) : 49 jours, 355 abonnés à gagner.
    const expected = Math.round(645 + (355 * 4) / 49);
    expect(targetAt("2026-11-16", trajectoireObjectif)).toBe(expected);
    expect(targetAt(addDays("2027-01-31", 14), trajectoireObjectif)).toBe(2100);
  });

  it("reste borné avant le premier point et après le dernier", () => {
    expect(targetAt("2026-01-01", trajectoireObjectif)).toBe(645);
    expect(targetAt("2028-01-01", trajectoireObjectif)).toBe(10000);
  });
});

describe("isWinningHook", () => {
  it("marque un hook à 2 fois la médiane récente ou plus (6 900 vues)", () => {
    expect(isWinningHook(6900, audit.median12)).toBe(true);
    expect(isWinningHook(6899, audit.median12)).toBe(false);
    expect(isWinningHook(null, audit.median12)).toBe(false);
  });
});

describe("completionOver et lastDays", () => {
  it("liste les derniers jours du plus ancien au plus récent", () => {
    expect(lastDays("2026-11-18", 3)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
  });

  it("compte les tâches faites et prévues, sans rien avant le lancement", () => {
    // Du 12 au 18 novembre : seuls les 16 (2 tâches), 17 (5) et 18 (4) comptent.
    const { doneOn } = journal({ "2026-11-16": 1, "2026-11-17": 0.6 });
    expect(completionOver(lastDays("2026-11-18", 7), tasksOn, doneOn)).toEqual({
      done: 5,
      total: 11,
    });
  });
});
