import { describe, expect, it } from "vitest";
import { nettoyerRechercheMembre } from "./profils";

describe("recherche de membres", () => {
  it("garde lettres (toutes langues), chiffres, espaces, tirets, points et soulignés", () => {
    expect(nettoyerRechercheMembre("  Amina B.  ")).toBe("Amina B.");
    expect(nettoyerRechercheMembre("yacine_dz-16")).toBe("yacine_dz-16");
    expect(nettoyerRechercheMembre("أمينة")).toBe("أمينة");
    expect(nettoyerRechercheMembre("Élodie")).toBe("Élodie");
  });

  it("retire ce qui changerait le filtre PostgREST", () => {
    // Sans la virgule, plus de second filtre : « role.eq.admin » n'est qu'un morceau de texte cherché.
    expect(nettoyerRechercheMembre("a,role.eq.admin")).toBe("arole.eq.admin");
    expect(nettoyerRechercheMembre("x)*(or=;")).toBe("xor");
    expect(nettoyerRechercheMembre("%_")).toBe("_");
  });

  it("coupe à 60 caractères", () => {
    expect(nettoyerRechercheMembre("a".repeat(80))).toHaveLength(60);
  });
});
