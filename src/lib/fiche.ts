import { aDesCoordonnees } from "./carte-catalogue";
import { normaliserCle } from "./detecterVisuel";
import type { Donnee, Ressource } from "./types";

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

export interface OptionTelechargement {
  format: string;
  natif: boolean;
  url: string;
}

export interface FormatsBouton {
  /** Format du bouton principal (Excel s'il existe, sinon CSV ou le fichier natif). */
  principal: OptionTelechargement;
  /** Autres formats convertibles ou fichiers natifs réellement disponibles. */
  autres: OptionTelechargement[];
}

const ORDRE_MENU = ["csv", "json", "geojson"];
const FORMATS_SOURCE_CONVERTIBLES = new Set(["csv", "json", "geojson"]);
const FORMATS_SORTIE = new Set(["csv", "xlsx", "json", "geojson", "parquet"]);

export const aSourceConvertible = (ressource: Ressource): boolean =>
  ressource.fichiers.some((fichier) => FORMATS_SOURCE_CONVERTIBLES.has(fichier.format.toLowerCase()));

/** Le fichier natif est servi en téléchargement joint, et non en affichage inline. */
function urlEnTelechargement(url: string): string {
  const separateur = url.indexOf("?");
  if (separateur < 0) return url;
  const chemin = url.slice(0, separateur);
  const parametres = new URLSearchParams(url.slice(separateur + 1));
  parametres.delete("inline");
  const query = parametres.toString();
  return query ? `${chemin}?${query}` : chemin;
}

/**
 * Ne montre les conversions que si une source tabulaire permet de les produire.
 * Pour les autres formats, ne garde que les fichiers d'origine.
 */
export function telechargementsRessource(ressource: Ressource): OptionTelechargement[] {
  if (!aSourceConvertible(ressource)) {
    return ressource.fichiers.map((fichier) => ({
      format: fichier.format.toLowerCase(),
      natif: true,
      url: urlEnTelechargement(fichier.url),
    }));
  }

  const formatsConvertis = ressource.telechargements.map((element) => ({ ...element }));
  const fichiersNatifsNonConvertibles = ressource.fichiers
    .filter((fichier) => !FORMATS_SORTIE.has(fichier.format.toLowerCase()))
    .map((fichier) => ({ format: fichier.format.toLowerCase(), natif: true, url: urlEnTelechargement(fichier.url) }));
  return [...formatsConvertis, ...fichiersNatifsNonConvertibles];
}

/** Bouton « Télécharger (Excel) ▾ » : Excel en principal, les conversions disponibles et les autres fichiers natifs dans le menu. */
export function formatsBouton(ressource: Ressource | undefined): FormatsBouton | null {
  if (!ressource) return null;
  const telechargements = telechargementsRessource(ressource);
  if (telechargements.length === 0) return null;
  const parFormat = new Map(telechargements.map((element) => [element.format, element]));
  const principal = parFormat.get("xlsx") ?? parFormat.get("csv") ?? telechargements[0];
  const sourceConvertible = aSourceConvertible(ressource);
  const geojsonDOrigine = ressource.fichiers.some((fichier) => fichier.format.toLowerCase() === "geojson");
  const autresOrdonnes = ORDRE_MENU
    .filter((format) => format !== principal.format && (format !== "geojson" || geojsonDOrigine))
    .map((format) => parFormat.get(format))
    .filter((element): element is OptionTelechargement => Boolean(element));
  const autresSupplementaires = telechargements.filter((element) => element.format !== principal.format && !ORDRE_MENU.includes(element.format));
  const autres = sourceConvertible ? [...autresOrdonnes, ...autresSupplementaires] : telechargements.filter((element) => element.format !== principal.format);
  return { principal, autres };
}

/** Ressource du bouton de l'en-tête : le fichier principal, sinon le premier. */
export const ressourcePrincipale = (ressources: Ressource[]) => ressources.find((ressource) => ressource.principal) ?? ressources[0];
