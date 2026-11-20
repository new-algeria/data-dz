import { describe, expect, it } from "vitest";
import { DEBUT_STATISTIQUES, enNombre, estPeriode, intervallePeriode, libellePeriode, part, pasPourDuree, totauxSerie } from "./analytics";

const maintenant = new Date("2026-11-20T12:00:00Z");

describe("intervallePeriode", () => {
  it("7 et 30 jours : pas quotidien", () => {
    const i = intervallePeriode("7j", maintenant);
    expect(i.pas).toBe("day");
    expect(i.debut.toISOString()).toBe("2026-11-13T12:00:00.000Z");
    expect(i.fin.toISOString()).toBe("2026-11-20T12:00:00.000Z");
    expect(intervallePeriode("30j", maintenant).debut.toISOString()).toBe("2026-10-21T12:00:00.000Z");
  });
  it("90 jours : pas hebdomadaire ; 12 mois : pas mensuel", () => {
    expect(intervallePeriode("90j", maintenant).pas).toBe("week");
    const an = intervallePeriode("12m", maintenant);
    expect(an.pas).toBe("month");
    expect(an.debut.toISOString()).toBe("2025-11-20T12:00:00.000Z");
  });
  it("depuis le début : du premier jour d'enregistrement à maintenant, pas adapté à la durée", () => {
    const tout = intervallePeriode("tout", maintenant);
    expect(tout.debut).toEqual(DEBUT_STATISTIQUES);
    expect(tout.pas).toBe("day");
    expect(intervallePeriode("tout", new Date("2028-06-01T00:00:00Z")).pas).toBe("month");
    expect(pasPourDuree(new Date("2026-01-01"), new Date("2026-07-01"))).toBe("week");
  });
});

describe("outils", () => {
  it("estPeriode", () => {
    expect(estPeriode("30j")).toBe(true);
    expect(estPeriode("1j")).toBe(false);
    expect(estPeriode(null)).toBe(false);
  });
  it("enNombre accepte les bigint en chaîne", () => {
    expect(enNombre("42")).toBe(42);
    expect(enNombre(null)).toBe(0);
    expect(enNombre("x")).toBe(0);
  });
  it("totauxSerie et part", () => {
    const t = totauxSerie([
      { periode: "a", vues: 3, telechargements: 1 },
      { periode: "b", vues: 5, telechargements: 2 },
    ]);
    expect(t).toEqual({ vues: 8, telechargements: 3 });
    expect(part(1, 3)).toBe(33);
    expect(part(1, 0)).toBe(0);
  });
  it("libellePeriode à l'heure d'Alger", () => {
    expect(libellePeriode("2026-11-01T00:00:00+01:00", "month", "fr-FR")).toMatch(/nov\.? 2026/);
    expect(libellePeriode("2026-11-19T23:00:00Z", "day", "fr-FR")).toMatch(/^20 nov/);
  });
});
