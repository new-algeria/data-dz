import type { ResumeDonnee } from "./types";

/** Une donnée ajoutée au catalogue depuis moins de 4 jours (après l'import initial) passe en tête du catalogue. */
export const JOURS_RECENTS = 4;
const DUREE_RECENTE = JOURS_RECENTS * 24 * 60 * 60 * 1000;

type AvecDates = Pick<ResumeDonnee, "publie_le" | "cree_le">;

/** Date d'ajout au catalogue : première publication, sinon création (millisecondes), `null` si inconnue. */
export function dateAjout(donnee: AvecDates): number | null {
  const date = Date.parse(donnee.publie_le ?? donnee.cree_le ?? "");
  return Number.isNaN(date) ? null : date;
}

/** Marge après l'import initial : ce qui a été ajouté avant `médiane + 3 jours` n'est pas une nouveauté. */
export const JOURS_IMPORT_INITIAL = 3;
const JOUR = 24 * 60 * 60 * 1000;

/**
 * Date à partir de laquelle un ajout est une vraie nouveauté : date d'ajout médiane du catalogue + 3 jours.
 * Le catalogue a été importé d'un bloc : sans ce seuil, toutes ses données seraient « Nouveau » (et en tête)
 * pendant les jours qui suivent l'import. La médiane ignore les quelques données plus anciennes ou plus récentes.
 * `null` (catalogue pas encore chargé, ou sans date) : rien n'est présenté comme nouveau.
 */
export function seuilNouveautes(liste: AvecDates[]): number | null {
  const dates = liste
    .map(dateAjout)
    .filter((date): date is number => date !== null)
    .sort((a, b) => a - b);
  if (dates.length === 0) return null;
  return dates[Math.floor((dates.length - 1) / 2)] + JOURS_IMPORT_INITIAL * JOUR;
}

/** Ajoutée après l'import initial (`seuil`) et depuis moins de `duree` millisecondes. */
export function ajouteeDepuis(donnee: AvecDates, duree: number, seuil: number | null, maintenant = Date.now()): boolean {
  const date = dateAjout(donnee);
  return date !== null && seuil !== null && date >= seuil && maintenant - date < duree;
}

export function estRecente(donnee: AvecDates, seuil: number | null, maintenant = Date.now()): boolean {
  return ajouteeDepuis(donnee, DUREE_RECENTE, seuil, maintenant);
}

/**
 * Données récentes en tête (la plus récente d'abord), quel que soit le tri ou le filtre choisi ;
 * les autres gardent l'ordre reçu.
 */
export function recentsEnPremier<T extends AvecDates>(liste: T[], seuil: number | null, maintenant = Date.now()): T[] {
  const recentes = liste.filter((donnee) => estRecente(donnee, seuil, maintenant));
  if (recentes.length === 0) return liste;
  recentes.sort((a, b) => (dateAjout(b) ?? 0) - (dateAjout(a) ?? 0));
  return [...recentes, ...liste.filter((donnee) => !estRecente(donnee, seuil, maintenant))];
}
