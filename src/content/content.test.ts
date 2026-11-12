import { describe, expect, it } from "vitest";
import complementJson from "../../content/complement.json";
import contenuJson from "../../content/contenu.json";
import { complement, contenu } from "./index";
import { complementSchema, contenuSchema } from "./schema";

describe("contenu du plan", () => {
  it("respecte la structure attendue par le site", () => {
    expect(contenuSchema.safeParse(contenuJson).error?.issues).toBeUndefined();
    expect(complementSchema.safeParse(complementJson).error?.issues).toBeUndefined();
  });

  it("contient les volumes du game plan", () => {
    expect(contenu.programme.phases.map((phase) => phase.n)).toEqual([1, 2, 3, 4]);
    expect(contenu.concepts).toHaveLength(21);
    expect(contenu.reelsEssai).toHaveLength(8);
    expect(contenu.montage.prompts).toHaveLength(6);
    expect(contenu.regles2026).toHaveLength(8);
    expect(contenu.premieresFois).toHaveLength(16);
    expect(contenu.programme.trajectoireObjectif).toHaveLength(10);
  });

  it("enchaîne les phases sans trou ni chevauchement", () => {
    const { phases, debut } = contenu.programme;
    expect(phases[0]?.from).toBe(debut);
    for (let index = 1; index < phases.length; index += 1) {
      const previous = phases[index - 1];
      const current = phases[index];
      expect(previous && current && previous.to < current.from).toBe(true);
      expect(previous?.goal[1]).toBe(current?.goal[0]);
    }
  });

  it("répartit le mix des buts sur 100 %", () => {
    const total = complement.plan.mix.reduce((sum, line) => sum + line.part, 0);
    expect(total).toBe(100);
  });

  it("ne contient ni tiret long ni mention interdite", () => {
    const everything = JSON.stringify(contenuJson) + JSON.stringify(complementJson);
    expect(everything).not.toContain("—");
    expect(everything.toLowerCase()).not.toContain("uppercut");
  });
});
