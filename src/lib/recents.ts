import type { ResumeDonnee } from "./types";

/** Une donnée ajoutée au catalogue depuis moins de 4 jours est « Récente » : badge et place en tête du catalogue. */
export const JOURS_RECENTS = 4;
const DUREE_RECENTE = JOURS_RECENTS * 24 * 60 * 60 * 1000;

type AvecDates = Pick<ResumeDonnee, "publie_le" | "cree_le">;

/** Date d'ajout au catalogue : première publication, sinon création (millisecondes), `null` si inconnue. */
export function dateAjout(donnee: AvecDates): number | null {
  const date = Date.parse(donnee.publie_le ?? donnee.cree_le ?? "");
  return Number.isNaN(date) ? null : date;
}

export function estRecente(donnee: AvecDates, maintenant = Date.now()): boolean {
  const date = dateAjout(donnee);
  return date !== null && maintenant - date < DUREE_RECENTE;
}

/**
 * Données récentes en tête (la plus récente d'abord), quel que soit le tri ou le filtre choisi ;
 * les autres gardent l'ordre reçu.
 */
export function recentsEnPremier<T extends AvecDates>(liste: T[], maintenant = Date.now()): T[] {
  const recentes = liste.filter((donnee) => estRecente(donnee, maintenant));
  if (recentes.length === 0) return liste;
  recentes.sort((a, b) => (dateAjout(b) ?? 0) - (dateAjout(a) ?? 0));
  return [...recentes, ...liste.filter((donnee) => !estRecente(donnee, maintenant))];
}
