import { describe, expect, it } from "vitest";
import { rechercherDonnees } from "./recherche-rapide";
import type { ResumeDonnee } from "./types";

const donnee = (slug: string, titre: Record<string, string>, mots_cles: string[] = [], source = "GeoAlgeria") =>
  ({ slug, titre, mots_cles, sources: { nom: source } }) as unknown as ResumeDonnee;

const liste = [
  donnee("pharmacies", { fr: "Pharmacies d'Algérie", en: "Algeria pharmacies", ar: "صيدليات الجزائر" }, ["santé", "officines"]),
  donnee("industrie-pharmaceutique", { fr: "Industrie pharmaceutique d'Algérie", en: "Algeria pharmaceutical manufacturers" }),
  donnee("ecoles", { fr: "Écoles d'Algérie", en: "Algeria schools", ar: "مدارس الجزائر" }, ["éducation"]),
  donnee("plages", { fr: "Plages", en: "Beaches" }, [], "OpenStreetMap"),
];
const slugs = (resultats: ResumeDonnee[]) => resultats.map((element) => element.slug);

describe("recherche de l'en-tête", () => {
  it("trouve par début de mot, sans casse ni accents, titre affiché d'abord", () => {
    expect(slugs(rechercherDonnees(liste, "pharma", "fr"))).toEqual(["pharmacies", "industrie-pharmaceutique"]);
    expect(slugs(rechercherDonnees(liste, "ECOLE", "fr"))).toEqual(["ecoles"]);
    expect(slugs(rechercherDonnees(liste, "education", "fr"))).toEqual(["ecoles"]);
  });

  it("cherche dans toutes les langues, les mots-clés et la source", () => {
    expect(slugs(rechercherDonnees(liste, "beaches", "fr"))).toEqual(["plages"]);
    expect(slugs(rechercherDonnees(liste, "مدارس", "ar"))).toEqual(["ecoles"]);
    expect(slugs(rechercherDonnees(liste, "openstreet", "fr"))).toEqual(["plages"]);
    expect(slugs(rechercherDonnees(liste, "officines", "fr"))).toEqual(["pharmacies"]);
  });

  it("exige tous les mots et limite le nombre de résultats", () => {
    expect(slugs(rechercherDonnees(liste, "pharma industrie", "fr"))).toEqual(["industrie-pharmaceutique"]);
    expect(rechercherDonnees(liste, "algérie", "fr", 2)).toHaveLength(2);
    expect(rechercherDonnees(liste, "   ", "fr")).toEqual([]);
    expect(rechercherDonnees(liste, "zzz", "fr")).toEqual([]);
  });
});
