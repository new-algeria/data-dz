import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fr from "@/locales/fr/translation.json";
import en from "@/locales/en/translation.json";
import ar from "@/locales/ar/translation.json";
import type { ResumeDonnee } from "./types";
import {
  DOMAINES_IA,
  donneesDuDomaine,
  estCleLicence,
  imageRessource,
  RESSOURCES_IA,
  ressourcesCorrespondantes,
  ressourcesDuDomaine,
} from "./ressources-ia";

describe("liste des ressources", () => {
  it("santé est le premier domaine", () => {
    expect(DOMAINES_IA[0].code).toBe("sante");
  });

  it("chaque ressource est complète : identifiant unique, domaine connu, lien https, image et crédit", () => {
    const ids = RESSOURCES_IA.map((ressource) => ressource.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ressource of RESSOURCES_IA) {
      expect(DOMAINES_IA.some((domaine) => domaine.code === ressource.domaine)).toBe(true);
      expect(ressource.url).toMatch(/^https:\/\//);
      expect(existsSync(`public${imageRessource(ressource)}`)).toBe(true);
      expect(ressource.credit.auteur).not.toBe("");
      expect(ressource.credit.licence).not.toBe("");
      expect(ressource.credit.page).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });

  it("chaque ressource et chaque domaine ont leurs textes en fr, en et ar", () => {
    for (const traduction of [fr, en, ar]) {
      const textes = traduction.ressourcesIA as {
        ressources: Record<string, { description?: string; idee?: string; chiffre?: string }>;
        domaines: Record<string, { nom?: string }>;
      };
      for (const ressource of RESSOURCES_IA) {
        expect(textes.ressources[ressource.id]?.description, ressource.id).toBeTruthy();
        expect(textes.ressources[ressource.id]?.idee, ressource.id).toBeTruthy();
        if (ressource.chiffre) expect(textes.ressources[ressource.id]?.chiffre, ressource.id).toBeTruthy();
      }
      for (const domaine of DOMAINES_IA) expect(textes.domaines[domaine.code]?.nom, domaine.code).toBeTruthy();
      const licences = (traduction.ressourcesIA as { licences: Record<string, string> }).licences;
      for (const ressource of RESSOURCES_IA.filter((element) => estCleLicence(element.licence))) {
        expect(licences[ressource.licence], ressource.licence).toBeTruthy();
      }
    }
  });
});

describe("ressourcesCorrespondantes", () => {
  it("sans filtre : toutes", () => {
    expect(ressourcesCorrespondantes(RESSOURCES_IA, { terme: "", categorie: null })).toHaveLength(RESSOURCES_IA.length);
  });

  it("par catégorie du catalogue", () => {
    const sante = ressourcesCorrespondantes(RESSOURCES_IA, { terme: "", categorie: "sante" });
    expect(sante.length).toBeGreaterThan(0);
    expect(sante.every((ressource) => ressource.categorie === "sante")).toBe(true);
  });

  it("par recherche, sans casse ni accents, chaque mot au début d'un mot", () => {
    const ids = (terme: string) => ressourcesCorrespondantes(RESSOURCES_IA, { terme, categorie: null }).map((ressource) => ressource.id);
    expect(ids("MÉDICAL")).toContain("medmnist");
    expect(ids("kabyle")).toContain("common-voice");
    expect(ids("radio poumon")).toEqual(["chestxray14"]);
    expect(ids("médical")).toEqual(expect.arrayContaining(["medmnist", "chestxray14", "isic", "brats", "physionet", "uci-ml"]));
    expect(ids("IA")).toHaveLength(RESSOURCES_IA.length);
    expect(ids("abcdefgh")).toEqual([]);
  });

  it("utilise aussi les textes traduits fournis", () => {
    const ids = ressourcesCorrespondantes(RESSOURCES_IA, { terme: "زلزال", categorie: null }, (ressource) =>
      ressource.id === "opus" ? ["زلزال"] : []
    ).map((ressource) => ressource.id);
    expect(ids).toEqual(["opus"]);
  });
});

describe("par domaine", () => {
  const donnee = (slug: string, categorie: string | null, telechargements: number, vues = 0) =>
    ({ slug, categorie_slug: categorie, nb_telechargements: telechargements, nb_vues: vues }) as unknown as ResumeDonnee;

  it("ressourcesDuDomaine garde l'ordre de la liste", () => {
    expect(ressourcesDuDomaine("sante")[0].id).toBe("medmnist");
  });

  it("donneesDuDomaine : catégories du domaine, plus téléchargées puis plus vues", () => {
    const catalogue = [donnee("a", "sante", 1, 50), donnee("b", "sante", 9), donnee("c", "transport", 99), donnee("d", "sante", 1, 80), donnee("e", null, 5)];
    expect(donneesDuDomaine("sante", catalogue, 2).map((element) => element.slug)).toEqual(["b", "d"]);
    expect(donneesDuDomaine("satellite", catalogue)).toEqual([]);
  });
});
