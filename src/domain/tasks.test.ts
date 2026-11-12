import { describe, expect, it } from "vitest";
import reference from "../../reference/contenu.json";
import { complement, contenu } from "../content";
import { phaseNumberAt, phaseOn } from "./phases";
import { plannedTasks, taskIds } from "./tasks";

const { phases, debut } = contenu.programme;

describe("plannedTasks", () => {
  // Les sorties attendues viennent du prototype : reference/contenu.json, clé exemplesTodo.
  it.each(Object.entries(reference.exemplesTodo))(
    "donne la to-do attendue le %s",
    (date, expected) => {
      const actual = plannedTasks(date, debut, phaseNumberAt(phases, date)).map((task) => ({
        id: task.id,
        type: task.kind,
        titre: complement.taches[task.id].titre,
      }));
      expect(actual).toEqual(expected);
    },
  );

  it("ne prévoit rien avant le lancement", () => {
    expect(plannedTasks("2026-11-15", debut, 1)).toEqual([]);
  });

  it("ajoute la revue du mois le 1er", () => {
    const ids = plannedTasks("2026-12-01", debut, 1).map((task) => task.id);
    expect(ids).toContain("review");
  });

  it("alterne le carrousel du samedi en phase 2 : semaines paires seulement", () => {
    const carouselOn = (date: string) =>
      plannedTasks(date, debut, 2).some((task) => task.id === "carousel");
    expect(carouselOn("2026-12-26")).toBe(true); // semaine 6
    expect(carouselOn("2027-01-02")).toBe(false); // semaine 7
    expect(carouselOn("2027-01-09")).toBe(true); // semaine 8
  });

  it("suit la phase forcée par le coach à partir de sa date, pas avant", () => {
    // Le coach passe Victor en phase 2 le vendredi 4 décembre, deux semaines avant le calendrier.
    const override = { phase: 2, from: "2026-12-04" };
    const idsOn = (date: string) =>
      plannedTasks(date, debut, phaseOn(phases, date, override)).map((task) => task.id);

    expect(idsOn("2026-11-27")).not.toContain("trial_fri"); // vendredi d'avant : phase 1
    expect(idsOn("2026-12-04")).toContain("trial_fri"); // dès le jour forcé : phase 2
  });
});

describe("textes des tâches", () => {
  it("existe pour chaque tâche que la règle peut produire", () => {
    for (const id of taskIds) {
      expect(complement.taches[id].titre.length).toBeGreaterThan(0);
      expect(complement.taches[id].aide.length).toBeGreaterThan(0);
    }
  });
});
