import { describe, expect, it } from "vitest";
import { deuxPhrases, formatsBouton, wilayasCouvertes } from "./fiche";
import type { Ressource } from "./types";

const ressource = (natifs: string[], sorties = ["csv", "xlsx", "json", "geojson"]): Ressource => ({
  nom: "f",
  principal: true,
  fichiers: natifs.map((format) => ({ format, taille_octets: 1, url: "u" })),
  telechargements: sorties.map((format) => ({ format: format as Ressource["telechargements"][number]["format"], natif: natifs.includes(format), url: `u?format=${format}` })),
});
const version = (...colonnes: string[]) => ({ numero: "1", nb_lignes: 1, apercu: null, publie_le: null, fichiers: null, colonnes: colonnes.map((nom) => ({ nom, type: "texte" })) });

describe("en-tête de la fiche", () => {
  it("garde les deux premières phrases du résumé", () => {
    expect(deuxPhrases("Les bibliothèques d'Algérie. Pour lire près de chez soi ! Et le reste.")).toBe("Les bibliothèques d'Algérie. Pour lire près de chez soi !");
    expect(deuxPhrases("Une seule phrase sans point")).toBe("Une seule phrase sans point");
    expect(deuxPhrases("مساجد الجزائر. مع أسمائها؟ ومواقعها.")).toBe("مساجد الجزائر. مع أسمائها؟");
    expect(deuxPhrases("")).toBe("");
  });

  it("compte les wilayas couvertes seulement s'il y a une colonne wilaya ou des coordonnées", () => {
    expect(wilayasCouvertes({ versions: version("nom", "code_wilaya"), ressources: [], infos_source: { nb_wilayas_couvertes: 58 }, wilayas: [] })).toBe(58);
    expect(wilayasCouvertes({ versions: version("nom"), ressources: [ressource(["geojson"])], infos_source: null, wilayas: ["16", "31"] })).toBe(2);
    expect(wilayasCouvertes({ versions: version("annee", "valeur"), ressources: [ressource(["csv"])], infos_source: { nb_wilayas_couvertes: 58 }, wilayas: [] })).toBeNull();
    expect(wilayasCouvertes({ versions: version("Wilaya"), ressources: [], infos_source: null, wilayas: [] })).toBeNull();
  });

  it("met Excel en principal, puis CSV, JSON et GeoJSON s'il existe d'origine", () => {
    const geo = formatsBouton(ressource(["geojson", "json"]))!;
    expect(geo.principal.format).toBe("xlsx");
    expect(geo.autres.map((t) => t.format)).toEqual(["csv", "json", "geojson"]);
    const tableau = formatsBouton(ressource(["csv"]))!;
    expect(tableau.autres.map((t) => t.format)).toEqual(["csv", "json"]);
    expect(formatsBouton(ressource(["csv"], ["csv", "json"]))!.principal.format).toBe("csv");
    expect(formatsBouton(undefined)).toBeNull();
  });
});
