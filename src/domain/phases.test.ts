import { describe, expect, it } from "vitest";
import { contenu } from "../content";
import { currentPhaseNumber, goalProgress, phaseByNumber, phaseNumberAt } from "./phases";

const { phases, debut } = contenu.programme;

describe("phaseNumberAt", () => {
  it.each([
    ["2026-11-16", 1],
    ["2026-12-20", 1],
    ["2026-12-21", 2],
    ["2027-02-28", 2],
    ["2027-03-01", 3],
    ["2027-05-31", 3],
    ["2027-06-01", 4],
    ["2027-08-31", 4],
    ["2027-09-15", 4],
  ])("le %s tombe en phase %i", (date, expected) => {
    expect(phaseNumberAt(phases, date)).toBe(expected);
  });
});

describe("currentPhaseNumber", () => {
  it("affiche la phase 1 avant le lancement du 16 novembre", () => {
    expect(currentPhaseNumber(phases, debut, "2026-11-12")).toBe(1);
  });

  it("suit le calendrier une fois le programme lancé", () => {
    expect(currentPhaseNumber(phases, debut, "2027-01-06")).toBe(2);
  });
});

describe("phaseByNumber", () => {
  it("retrouve une phase par son numéro", () => {
    expect(phaseByNumber(phases, 3).name).toBe("L'accélération");
  });

  it("signale une phase inconnue", () => {
    expect(() => phaseByNumber(phases, 9)).toThrow();
  });
});

describe("goalProgress", () => {
  it("mesure le chemin entre deux paliers", () => {
    expect(goalProgress(645, [645, 1000])).toBe(0);
    expect(goalProgress(1000, [645, 1000])).toBe(1);
    expect(goalProgress(822.5, [645, 1000])).toBeCloseTo(0.5);
  });

  it("reste entre 0 et 1", () => {
    expect(goalProgress(600, [645, 1000])).toBe(0);
    expect(goalProgress(1400, [645, 1000])).toBe(1);
    expect(goalProgress(500, [500, 500])).toBe(0);
  });
});
