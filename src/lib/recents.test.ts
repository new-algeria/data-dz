import { describe, expect, it } from "vitest";
import { estRecente, recentsEnPremier, seuilNouveautes } from "./recents";

const maintenant = Date.parse("2026-10-29T12:00:00Z");
const jours = (n: number) => new Date(maintenant - n * 24 * 60 * 60 * 1000).toISOString();
// Catalogue importé il y a longtemps : le seuil est passé, seule la durée compte.
const ancien = seuilNouveautes([{ publie_le: jours(400) }]);

describe("seuil des nouveautés (import initial)", () => {
  it("vaut la date d'ajout médiane + 3 jours", () => {
    const liste = [{ publie_le: jours(10) }, { publie_le: jours(10.1) }, { publie_le: jours(9.9) }, { publie_le: jours(200) }, { publie_le: null, cree_le: jours(1) }];
    expect(seuilNouveautes(liste)).toBe(Date.parse(jours(10)) + 3 * 24 * 60 * 60 * 1000);
    expect(seuilNouveautes([])).toBeNull();
    expect(seuilNouveautes([{}])).toBeNull();
  });

  it("un catalogue importé d'un bloc n'a aucune donnée récente ; un ajout ultérieur l'est", () => {
    const importe = Array.from({ length: 30 }, (_, i) => ({ slug: `import-${i}`, publie_le: jours(10 + i / 100) }));
    const seuil = seuilNouveautes(importe);
    expect(importe.some((donnee) => estRecente(donnee, seuil, maintenant))).toBe(false);
    const ajout = { slug: "ajout", publie_le: jours(0.5) };
    const seuilAvecAjout = seuilNouveautes([...importe, ajout]);
    expect(estRecente(ajout, seuilAvecAjout, maintenant)).toBe(true);
    expect(recentsEnPremier([...importe, ajout], seuilAvecAjout, maintenant)[0].slug).toBe("ajout");
  });

  it("sans seuil (catalogue pas chargé), rien n'est récent", () => {
    expect(estRecente({ publie_le: jours(0.5) }, null, maintenant)).toBe(false);
  });
});

describe("données récentes", () => {
  it("est récente pendant 4 jours après sa première publication", () => {
    expect(estRecente({ publie_le: jours(0.5), cree_le: jours(30) }, ancien, maintenant)).toBe(true);
    expect(estRecente({ publie_le: jours(3.9) }, ancien, maintenant)).toBe(true);
    expect(estRecente({ publie_le: jours(4.1) }, ancien, maintenant)).toBe(false);
    // Sans date de publication : date de création.
    expect(estRecente({ publie_le: null, cree_le: jours(1) }, ancien, maintenant)).toBe(true);
    expect(estRecente({}, ancien, maintenant)).toBe(false);
  });

  it("met les récentes en tête, la plus récente d'abord, sans changer l'ordre des autres", () => {
    const liste = [
      { slug: "b", publie_le: jours(40) },
      { slug: "recente-2", publie_le: jours(2) },
      { slug: "a", publie_le: jours(10) },
      { slug: "recente-1", publie_le: jours(1) },
      { slug: "c", publie_le: null },
    ];
    expect(recentsEnPremier(liste, ancien, maintenant).map((d) => d.slug)).toEqual(["recente-1", "recente-2", "b", "a", "c"]);
    const sansRecente = liste.filter((d) => !d.slug.startsWith("recente"));
    expect(recentsEnPremier(sansRecente, ancien, maintenant)).toBe(sansRecente);
  });
});
