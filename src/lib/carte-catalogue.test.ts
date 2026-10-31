import { describe, expect, it } from "vitest";
import { actionVisuelle, chiffreCarte, estLibre, estNouvelle, estRestreinte, estSerieTemporelle, ilYA, sourceCourte } from "./carte-catalogue";
import type { Ressource } from "./types";

const maintenant = Date.parse("2026-10-30T12:00:00Z");
const ilYaJours = (n: number) => new Date(maintenant - n * 24 * 60 * 60 * 1000).toISOString();
const colonnes = (...nomsColonnes: string[]) => nomsColonnes.map((nom) => ({ nom, type: "texte" }));
const ressource = (format: string): Ressource => ({ nom: "f", principal: true, fichiers: [{ format, taille_octets: 1, url: "u" }], telechargements: [] });

describe("cartes du catalogue", () => {
  it("affiche « Nouveau » pendant 14 jours, jamais pour l'import initial", () => {
    const seuil = Date.parse(ilYaJours(300));
    expect(estNouvelle({ publie_le: ilYaJours(13) }, seuil, maintenant)).toBe(true);
    expect(estNouvelle({ publie_le: ilYaJours(15) }, seuil, maintenant)).toBe(false);
    expect(estNouvelle({ publie_le: null, cree_le: ilYaJours(2) }, seuil, maintenant)).toBe(true);
    expect(estNouvelle({}, seuil, maintenant)).toBe(false);
    // Importée avant le seuil (catalogue importé d'un bloc il y a 10 jours) : pas « Nouveau ».
    expect(estNouvelle({ publie_le: ilYaJours(10) }, Date.parse(ilYaJours(7)), maintenant)).toBe(false);
    expect(estNouvelle({ publie_le: ilYaJours(2) }, null, maintenant)).toBe(false);
  });

  it("pas de « Voir la carte » ni de « Graphique » pour une donnée non redistribuable", () => {
    const colonnesCarte = { ressources: [ressource("geojson")], versions: { nb_lignes: 1, colonnes: colonnes("name", "lat", "lon") } } as never;
    expect(actionVisuelle(colonnesCarte)).toBe("carte");
    expect(actionVisuelle({ ...(colonnesCarte as object), diffusion_restreinte: true } as never)).toBeNull();
    expect(estRestreinte({ diffusion_restreinte: true })).toBe(true);
    expect(estRestreinte({})).toBe(false);
  });

  it("reconnaît une série temporelle (année + valeur)", () => {
    expect(estSerieTemporelle(colonnes("indicateur", "Année", "valeur"))).toBe(true);
    expect(estSerieTemporelle(colonnes("year", "value"))).toBe(true);
    expect(estSerieTemporelle(colonnes("annee", "nom"))).toBe(false);
    expect(estSerieTemporelle(null)).toBe(false);
  });

  it("propose la carte (GeoJSON ou lat/lon), sinon le graphique (série), sinon rien", () => {
    expect(actionVisuelle({ ressources: [ressource("geojson")], versions: null })).toBe("carte");
    expect(actionVisuelle({ ressources: [ressource("json")], versions: { numero: "1", nb_lignes: 1, publie_le: null, colonnes: colonnes("nom", "Latitude", "longitude") } })).toBe(
      "carte"
    );
    expect(actionVisuelle({ ressources: [ressource("csv")], versions: { numero: "1", nb_lignes: 1, publie_le: null, colonnes: colonnes("annee", "valeur") } })).toBe(
      "graphique"
    );
    expect(actionVisuelle({ ressources: [ressource("csv")], versions: { numero: "1", nb_lignes: 1, publie_le: null, colonnes: colonnes("nom") } })).toBeNull();
    expect(actionVisuelle({ versions: null })).toBeNull();
  });

  it("compte les lignes avec l'unité devinée du titre", () => {
    expect(chiffreCarte({ slug: "x", versions: { numero: "1", nb_lignes: 586, publie_le: null, colonnes: colonnes("nom") } }, "Plages", "fr")).toEqual({
      genre: "compte",
      nombre: 586,
      unite: "plages",
    });
    expect(chiffreCarte({ slug: "x", versions: null }, "Plages", "fr")).toBeNull();
  });

  it("résume une série temporelle en indicateurs et années", () => {
    const serie = { numero: "1", nb_lignes: 1200, publie_le: null, colonnes: colonnes("indicateur", "annee", "valeur") };
    expect(
      chiffreCarte({ slug: "x", versions: serie, infos_source: { nb_indicateurs: 14, premiere_annee_observee: 1980, derniere_annee_projetee: "2031" } }, "Économie : chiffres et prévisions du FMI", "fr")
    ).toEqual({ genre: "serie", nombre: 14, debut: 1980, fin: 2031 });
    // Sans le nombre d'indicateurs : le compte des lignes.
    expect(chiffreCarte({ slug: "x", versions: serie, infos_source: null }, "Économie : chiffres", "fr")).toEqual({ genre: "compte", nombre: 1200, unite: "éléments" });
  });

  it("raccourcit la source et lit la licence", () => {
    expect(sourceCourte("Office National des Statistiques (ONS)")).toBe("Office National des Statist…");
    expect(sourceCourte("OpenStreetMap - contributeurs")).toBe("OpenStreetMap");
    expect(estLibre({ usage_commercial: true })).toBe(true);
    expect(estLibre({ usage_commercial: false })).toBe(false);
    expect(estLibre(null)).toBe(false);
  });

  it("dit depuis quand la donnée a été mise à jour", () => {
    expect(ilYA(ilYaJours(2), "fr", maintenant)).toBe("avant-hier");
    expect(ilYA(ilYaJours(5), "fr", maintenant)).toBe("il y a 5 jours");
    expect(ilYA(ilYaJours(0.2), "en", maintenant)).toBe("today");
    expect(ilYA(ilYaJours(70), "en", maintenant)).toBe("2 months ago");
    expect(ilYA("pas une date", "fr", maintenant)).toBeNull();
  });
});
