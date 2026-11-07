import { describe, expect, it } from "vitest";
import { donneesDansLOrdre, fonctionAbsente } from "./contributions";

describe("données proposées par un membre", () => {
  it("garde l'ordre des propositions et ignore les données absentes du catalogue", () => {
    const proposees = [
      { dataset_id: "3", slug: "plages", publiee_le: "2026-11-05" },
      { dataset_id: "9", slug: "retiree", publiee_le: "2026-11-01" },
      { dataset_id: "1", slug: "ecoles", publiee_le: "2026-10-20" },
    ];
    const catalogue = [{ slug: "ecoles" }, { slug: "pharmacies" }, { slug: "plages" }];
    expect(donneesDansLOrdre(proposees, catalogue).map((donnee) => donnee.slug)).toEqual(["plages", "ecoles"]);
    expect(donneesDansLOrdre([], catalogue)).toEqual([]);
  });

  it("reconnaît une fonction pas encore créée en base", () => {
    expect(fonctionAbsente({ code: "PGRST202" })).toBe(true);
    expect(fonctionAbsente({ code: "42883" })).toBe(true);
    expect(fonctionAbsente({ code: "42501" })).toBe(false);
    expect(fonctionAbsente(null)).toBe(false);
  });
});
