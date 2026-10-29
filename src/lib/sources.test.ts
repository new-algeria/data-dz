import { describe, expect, it } from "vitest";
import { cleNomSource, sourceCorrespondante } from "./sources";

const sources = [
  { slug: "communaute", nom: "Communauté data-dz", type: "communautaire", url: null },
  { slug: "banque-mondiale", nom: "Banque mondiale", type: "officielle", url: "https://data.worldbank.org" },
  { slug: "ons", nom: "Office National des Statistiques", type: "officielle", url: "https://www.ons.dz" },
];

describe("sources", () => {
  it("compare les noms sans casse, accents, ponctuation ni espaces", () => {
    expect(cleNomSource("Ministère de la Santé")).toBe(cleNomSource("ministere-de-la-sante"));
    expect(cleNomSource("O.N.S.")).toBe("ons");
  });

  it("retrouve une source par son nom ou son slug", () => {
    expect(sourceCorrespondante(sources, "BANQUE MONDIALE", null)?.slug).toBe("banque-mondiale");
    expect(sourceCorrespondante(sources, "O.N.S", null)?.slug).toBe("ons");
  });

  it("retrouve une source par son site, avec ou sans www", () => {
    expect(sourceCorrespondante(sources, "ONS Algérie", "https://ons.dz/IMG/pdf/rapport.pdf")?.slug).toBe("ons");
    expect(sourceCorrespondante(sources, null, "https://data.worldbank.org/country/algeria")?.slug).toBe("banque-mondiale");
  });

  it("ne devine rien quand rien ne correspond", () => {
    expect(sourceCorrespondante(sources, "Ministère de la Santé", "https://www.sante.gov.dz")).toBeNull();
    expect(sourceCorrespondante(sources, null, "pas une url")).toBeNull();
    expect(sourceCorrespondante(sources, null, null)).toBeNull();
  });
});
