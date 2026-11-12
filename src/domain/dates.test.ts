import { describe, expect, it } from "vitest";
import { formatShort, todayInParis, yearOf } from "./dates";

describe("todayInParis", () => {
  it("passe au lendemain dès minuit à Paris, en hiver (UTC+1)", () => {
    expect(todayInParis(new Date("2026-11-15T22:59:00Z"))).toBe("2026-11-15");
    expect(todayInParis(new Date("2026-11-15T23:00:00Z"))).toBe("2026-11-16");
  });

  it("passe au lendemain dès minuit à Paris, en été (UTC+2)", () => {
    expect(todayInParis(new Date("2027-06-30T21:59:00Z"))).toBe("2027-06-30");
    expect(todayInParis(new Date("2027-06-30T22:00:00Z"))).toBe("2027-07-01");
  });
});

describe("formatage", () => {
  it("écrit les dates comme dans le plan", () => {
    expect(formatShort("2026-11-16")).toBe("16 nov.");
    expect(formatShort("2027-02-28")).toBe("28 févr.");
    expect(formatShort("2027-08-01")).toBe("1 août");
    expect(yearOf("2027-08-31")).toBe(2027);
  });

  it("refuse une date mal formée", () => {
    expect(() => formatShort("16/11/2026")).toThrow();
  });
});
