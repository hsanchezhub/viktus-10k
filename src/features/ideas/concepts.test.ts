import { describe, expect, it } from "vitest";
import { contenu } from "../../content";
import { conceptsFor, parseFilter, stripQuotes } from "./concepts";

const { concepts } = contenu;

describe("parseFilter", () => {
  it("reconnaît les buts et les réels d'essai", () => {
    expect(parseFilter("emo")).toBe("emo");
    expect(parseFilter("ess")).toBe("ess");
  });

  it("retombe sur « tous » pour une valeur absente ou inconnue", () => {
    expect(parseFilter(null)).toBe("all");
    expect(parseFilter("nimporte")).toBe("all");
  });
});

describe("conceptsFor", () => {
  it("compte les concepts de chaque but", () => {
    const count = (goal: Parameters<typeof conceptsFor>[1]) =>
      conceptsFor(concepts, goal, 1).length;
    expect(count("all")).toBe(21);
    expect(count("fid")).toBe(7);
    expect(count("int")).toBe(4);
    expect(count("emo")).toBe(5);
    expect(count("rec")).toBe(2);
    expect(count("ven")).toBe(3);
  });

  it("place les concepts disponibles en premier, puis par phase d'ouverture", () => {
    const opening = conceptsFor(concepts, "all", 1).map((concept) => concept.desLaPhase);
    expect(opening).toEqual(opening.toSorted((a, b) => a - b));
    expect(opening.filter((phase) => phase === 1)).toHaveLength(10);
  });

  it("garde l'ordre du contenu à phase égale", () => {
    const titles = conceptsFor(concepts, "fid", 1).map((concept) => concept.titre);
    expect(titles.slice(0, 3)).toEqual([
      "La Transfo",
      "30 minutes en 30 secondes",
      "Burst, taper ou dégradé ?",
    ]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const before = concepts.map((concept) => concept.titre);
    conceptsFor(concepts, "all", 3);
    expect(concepts.map((concept) => concept.titre)).toEqual(before);
  });
});

describe("stripQuotes", () => {
  it("retire les guillemets français autour d'un hook", () => {
    expect(stripQuotes("« Mets le son. »")).toBe("Mets le son.");
  });
});
