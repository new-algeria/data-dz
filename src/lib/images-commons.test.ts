import { describe, expect, it } from "vitest";
import { estLibre, lireResultats, termesDeRepli, termesRecherche, urlRecherche, urlVignetteDepuis, type ReponseRecherche } from "./images-commons";

const meta = (licence: string, attribution = "false", restrictions = "") => ({
  License: { value: licence },
  AttributionRequired: { value: attribution },
  Restrictions: { value: restrictions },
});

describe("termes de recherche", () => {
  it("titre anglais sans le pays ni la ponctuation, sinon le français", () => {
    expect(termesRecherche({ fr: "Pharmacies d'Algérie", en: "Pharmacies in Algeria" })).toBe("Pharmacies");
    expect(termesRecherche({ fr: "Barrages", en: "" })).toBe("Barrages");
    expect(termesRecherche({ en: "Oil and natural gas in Algeria" })).toBe("Oil natural gas");
    expect(termesRecherche({ en: "Algeria development indicators (World Bank)" })).toBe("development indicators");
    expect(termesRecherche({ fr: "Séismes en Algérie : catalogue USGS" })).toBe("Séismes");
    expect(termesRecherche(null)).toBe("");
  });

  it("repli : termes complets, puis 2 mots, puis 1", () => {
    expect(termesDeRepli("Oil natural gas")).toEqual(["Oil natural gas", "Oil natural", "Oil"]);
    expect(termesDeRepli("Pharmacies")).toEqual(["Pharmacies"]);
  });

  it("requête Commons filtrée sur les licences libres", () => {
    const url = new URL(urlRecherche("dam"));
    expect(url.searchParams.get("gsrsearch")).toBe("dam haswbstatement:P275=Q6938433|P6216=Q19652 filetype:bitmap");
    expect(url.searchParams.get("origin")).toBe("*");
  });
});

describe("licence et résultats", () => {
  it("seulement CC0 ou domaine public, sans attribution ni restriction", () => {
    expect(estLibre(meta("cc0"))).toBe(true);
    expect(estLibre(meta("pd"))).toBe(true);
    expect(estLibre(meta("pd-usgov"))).toBe(true);
    expect(estLibre(meta("cc-by-4.0", "true"))).toBe(false);
    expect(estLibre(meta("pd", "false", "personality"))).toBe(false);
    expect(estLibre(meta("cc0", "true"))).toBe(false);
    expect(estLibre(undefined)).toBe(false);
  });

  it("garde les images libres, assez grandes et horizontales, dans l'ordre de pertinence", () => {
    const image = (titre: string, index: number, largeur: number, hauteur: number, licence = "cc0", mime = "image/jpeg") => ({
      title: `File:${titre}.jpg`,
      index,
      imageinfo: [{ width: largeur, height: hauteur, mime, thumburl: `https://upload.wikimedia.org/x/1280px-${titre}.jpg`, descriptionurl: `https://commons.wikimedia.org/wiki/File:${titre}.jpg`, extmetadata: meta(licence) }],
    });
    const reponse: ReponseRecherche = {
      query: {
        pages: [
          image("Second", 2, 4000, 3000),
          image("Premier", 1, 2000, 1200),
          image("Portrait", 3, 1000, 2000),
          image("Petite", 4, 600, 400),
          image("Attribution", 5, 3000, 2000, "cc-by-sa-4.0"),
          image("Vectoriel", 6, 3000, 2000, "cc0", "image/svg+xml"),
        ],
      },
    };
    const resultats = lireResultats(reponse);
    expect(resultats.map((r) => r.titre)).toEqual(["Premier", "Second"]);
    expect(resultats[0].vignette).toBe("https://upload.wikimedia.org/x/330px-Premier.jpg");
  });

  it("vignette : l'original est gardé s'il n'y a pas de taille dans l'URL", () => {
    expect(urlVignetteDepuis("https://upload.wikimedia.org/a/b/Photo.jpg")).toBe("https://upload.wikimedia.org/a/b/Photo.jpg");
  });
});
