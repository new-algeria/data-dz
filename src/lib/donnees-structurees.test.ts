import { describe, expect, it } from "vitest";
import { descriptionMeta, jsonLdDataset, jsonLdWilaya, periodeCouverte, texteBrut, urlLicence } from "./donnees-structurees";
import type { Donnee } from "./types";

const donnee = (champs: Partial<Donnee> = {}): Donnee =>
  ({
    id: "1",
    slug: "pharmacies",
    titre: { fr: "Pharmacies" },
    description: { fr: "Toutes les pharmacies d'Algérie." },
    readme: null,
    categorie_slug: "sante",
    licence_code: "ODbL-1.0",
    licence_details: null,
    url_source: "https://geoalgeria.com",
    mots_cles: ["santé", "pharmacie"],
    infos_source: null,
    categories: null,
    sources: { slug: "geoalgeria", nom: "GeoAlgeria", url: "https://geoalgeria.com" },
    licences: null,
    versions: {
      numero: "3",
      nb_lignes: 10,
      colonnes: [{ nom: "nom" }, { nom: "wilaya" }],
      apercu: null,
      publie_le: "2026-11-01T00:00:00Z",
      fichiers: [],
    },
    ressources: [
      {
        nom: "pharmacies",
        principal: true,
        fichiers: [],
        telechargements: [
          { format: "csv", natif: false, url: "https://api.data-dz.com/v1/datasets/pharmacies/download?format=csv" },
          { format: "geojson", natif: true, url: "https://api.data-dz.com/v1/datasets/pharmacies/download?format=geojson" },
        ],
      },
    ],
    score: 0,
    nb_votes_pour: 0,
    nb_votes_contre: 0,
    nb_favoris: 0,
    nb_commentaires: 0,
    mis_a_jour_le: "2026-11-20T00:00:00Z",
    ...champs,
  }) as Donnee;

const options = {
  titre: "Pharmacies",
  description: "Toutes les pharmacies d'Algérie, avec leur adresse et leur wilaya, mises à jour chaque semaine.",
  complement: "Données ouvertes sur l'Algérie à télécharger sur data-dz.",
  url: "https://www.data-dz.com/datasets/pharmacies",
  langue: "fr",
};

describe("texteBrut et descriptionMeta", () => {
  it("retire le Markdown", () => {
    expect(texteBrut("**Gras** et [lien](https://x.dz)\n\n# Titre")).toBe("Gras et lien Titre");
  });
  it("garde un texte court tel quel", () => {
    expect(descriptionMeta("Court.")).toBe("Court.");
  });
  it("coupe entre deux mots à 160 caractères", () => {
    const resultat = descriptionMeta("mot ".repeat(80));
    expect(resultat.length).toBeLessThanOrEqual(160);
    expect(resultat.endsWith("mot…")).toBe(true);
  });
});

describe("periodeCouverte", () => {
  it("préfère la dernière année projetée", () => {
    expect(periodeCouverte({ premiere_annee_observee: 1975, derniere_annee_observee: 2020, derniere_annee_projetee: 2030 })).toBe("1975/2030");
  });
  it("accepte les années en texte et une seule année", () => {
    expect(periodeCouverte({ premiere_annee_observee: "2024" })).toBe("2024");
  });
  it("rien sans première année", () => {
    expect(periodeCouverte({ derniere_annee_observee: 2020 })).toBeNull();
    expect(periodeCouverte(null)).toBeNull();
  });
});

describe("urlLicence", () => {
  it("lien de la base, sinon SPDX", () => {
    expect(urlLicence({ licences: { code: "x", nom: "x", url: "https://licence.dz" }, licence_code: "x" })).toBe("https://licence.dz");
    expect(urlLicence({ licences: null, licence_code: "CC-BY-4.0" })).toBe("https://spdx.org/licenses/CC-BY-4.0.html");
    expect(urlLicence({ licences: null, licence_code: "licence maison" })).toBeNull();
  });
});

describe("jsonLdDataset", () => {
  it("décrit la donnée pour Google Dataset Search", () => {
    const bloc = jsonLdDataset(donnee({ infos_source: { premiere_annee_observee: 1981, derniere_annee_observee: 2025 } }), options);
    expect(bloc).toMatchObject({
      "@type": "Dataset",
      name: "Pharmacies",
      identifier: "pharmacies",
      license: "https://spdx.org/licenses/ODbL-1.0.html",
      creator: { "@type": "Organization", name: "GeoAlgeria", url: "https://geoalgeria.com" },
      keywords: ["santé", "pharmacie"],
      temporalCoverage: "1981/2025",
      version: "3",
      variableMeasured: ["nom", "wilaya"],
      isAccessibleForFree: true,
    });
    expect(bloc.distribution).toEqual([
      expect.objectContaining({ encodingFormat: "text/csv", name: "pharmacies.csv" }),
      expect.objectContaining({ encodingFormat: "application/geo+json" }),
    ]);
  });
  it("complète une description trop courte (50 caractères minimum)", () => {
    const bloc = jsonLdDataset(donnee(), { ...options, description: "Court." });
    expect(String(bloc.description).length).toBeGreaterThanOrEqual(50);
    expect(bloc.description).toContain("Court.");
  });
  it("aucun fichier pour une donnée non redistribuable", () => {
    const bloc = jsonLdDataset(donnee({ diffusion_restreinte: true }), options);
    expect(bloc.distribution).toBeUndefined();
  });
});

describe("jsonLdWilaya", () => {
  it("division administrative avec ses autres noms", () => {
    const bloc = jsonLdWilaya(
      { code: "16", nom: { fr: "Alger", ar: "الجزائر" }, population: null },
      { nom: "Alger", url: "https://www.data-dz.com/wilayas/16-alger", description: "Alger en chiffres" }
    );
    expect(bloc).toMatchObject({ "@type": "AdministrativeArea", identifier: "16", alternateName: ["الجزائر"] });
  });
});
