import { aDesCoordonnees } from "./carte-catalogue";
import { normaliserCle } from "./detecterVisuel";
import type { Donnee, FormatTelechargement, Ressource } from "./types";

/** En-tête de la fiche (fonctions pures, testées dans fiche.test.ts). */

/** Les deux premières phrases d'un texte (résumé de l'en-tête). */
export function deuxPhrases(texte: string): string {
  const phrases = texte.replace(/\s+/g, " ").trim().match(/[^.!?؟]+[.!?؟]+(?=\s|$)|[^.!?؟]+$/g) ?? [];
  return phrases.slice(0, 2).map((phrase) => phrase.trim()).join(" ");
}

/**
 * Nombre de wilayas couvertes, seulement si la donnée a une colonne wilaya ou des coordonnées :
 * `infos_source.nb_wilayas_couvertes` (écrit par la synchronisation), sinon la liste `wilayas` de la donnée.
 */
export function wilayasCouvertes(donnee: Pick<Donnee, "versions" | "ressources" | "infos_source" | "wilayas">): number | null {
  const colonneWilaya = (donnee.versions?.colonnes ?? []).some((colonne) => normaliserCle(colonne.nom).includes("wilaya"));
  if (!colonneWilaya && !aDesCoordonnees(donnee)) return null;
  const nombre = Number(donnee.infos_source?.nb_wilayas_couvertes);
  if (Number.isFinite(nombre) && nombre > 0) return Math.round(nombre);
  return donnee.wilayas && donnee.wilayas.length > 0 ? donnee.wilayas.length : null;
}

export interface FormatsBouton {
  /** Format du bouton principal (Excel s'il existe). */
  principal: Ressource["telechargements"][number];
  /** Autres formats du menu ▾ : CSV, JSON, puis GeoJSON si le fichier en a un. */
  autres: Ressource["telechargements"];
}

const ORDRE_MENU: FormatTelechargement[] = ["csv", "json", "geojson"];

/** Bouton « Télécharger (Excel) ▾ » : Excel en principal, CSV / JSON / GeoJSON (si présent d'origine) dans le menu. */
export function formatsBouton(ressource: Ressource | undefined): FormatsBouton | null {
  if (!ressource || ressource.telechargements.length === 0) return null;
  const parFormat = new Map(ressource.telechargements.map((element) => [element.format, element]));
  const principal = parFormat.get("xlsx") ?? parFormat.get("csv") ?? ressource.telechargements[0];
  const geojsonDOrigine = ressource.fichiers.some((fichier) => fichier.format === "geojson");
  const autres = ORDRE_MENU.filter((format) => format !== principal.format && (format !== "geojson" || geojsonDOrigine))
    .map((format) => parFormat.get(format))
    .filter((element): element is FormatsBouton["principal"] => Boolean(element));
  return { principal, autres };
}

/** Ressource du bouton de l'en-tête : le fichier principal, sinon le premier. */
export const ressourcePrincipale = (ressources: Ressource[]) => ressources.find((ressource) => ressource.principal) ?? ressources[0];
