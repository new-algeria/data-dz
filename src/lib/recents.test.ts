import { describe, expect, it } from "vitest";
import { estRecente, recentsEnPremier } from "./recents";

const maintenant = Date.parse("2026-10-29T12:00:00Z");
const jours = (n: number) => new Date(maintenant - n * 24 * 60 * 60 * 1000).toISOString();

describe("données récentes", () => {
  it("est récente pendant 4 jours après sa première publication", () => {
    expect(estRecente({ publie_le: jours(0.5), cree_le: jours(30) }, maintenant)).toBe(true);
    expect(estRecente({ publie_le: jours(3.9) }, maintenant)).toBe(true);
    expect(estRecente({ publie_le: jours(4.1) }, maintenant)).toBe(false);
    // Sans date de publication : date de création.
    expect(estRecente({ publie_le: null, cree_le: jours(1) }, maintenant)).toBe(true);
    expect(estRecente({}, maintenant)).toBe(false);
  });

  it("met les récentes en tête, la plus récente d'abord, sans changer l'ordre des autres", () => {
    const liste = [
      { slug: "b", publie_le: jours(40) },
      { slug: "recente-2", publie_le: jours(2) },
      { slug: "a", publie_le: jours(10) },
      { slug: "recente-1", publie_le: jours(1) },
      { slug: "c", publie_le: null },
    ];
    expect(recentsEnPremier(liste, maintenant).map((d) => d.slug)).toEqual(["recente-1", "recente-2", "b", "a", "c"]);
    const sansRecente = liste.filter((d) => !d.slug.startsWith("recente"));
    expect(recentsEnPremier(sansRecente, maintenant)).toBe(sansRecente);
  });
});
