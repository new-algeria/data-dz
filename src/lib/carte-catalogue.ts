import { devinerUnite, type LangueUnite } from "./deviner-unite";
import { normaliserCle } from "./detecterVisuel";
import { ajouteeDepuis } from "./recents";
import type { Colonne, Licence, ResumeDonnee } from "./types";

/**
 * Ce qu'affiche une carte du catalogue (fonctions pures, testées dans carte-catalogue.test.ts) :
 * badge « Nouveau », grand chiffre et son unité, bouton « Voir la carte » ou « Graphique », ligne discrète.
 */

/** Badge « Nouveau » : donnée ajoutée depuis moins de 14 jours, après l'import initial (la place en tête reste à 4 jours). */
export const JOURS_NOUVEAU = 14;
const JOUR = 24 * 60 * 60 * 1000;

/** `seuil` : fin de l'import initial (`seuilNouveautes()`), les données importées d'un bloc ne sont pas « Nouveau ». */
export function estNouvelle(donnee: Pick<ResumeDonnee, "publie_le" | "cree_le">, seuil: number | null, maintenant = Date.now()): boolean {
  return ajouteeDepuis(donnee, JOURS_NOUVEAU * JOUR, seuil, maintenant);
}

const noms = (colonnes: Colonne[] | null | undefined) => new Set((colonnes ?? []).map((colonne) => normaliserCle(colonne.nom)));

/** Série temporelle : une colonne d'année et une colonne de valeur (« annee » + « valeur »). */
export function estSerieTemporelle(colonnes: Colonne[] | null | undefined): boolean {
  const cles = noms(colonnes);
  return ["annee", "year"].some((cle) => cles.has(cle)) && ["valeur", "value"].some((cle) => cles.has(cle));
}

/** Points sur une carte : un fichier GeoJSON, ou des colonnes latitude + longitude. */
export function aDesCoordonnees(donnee: Pick<ResumeDonnee, "ressources" | "versions">): boolean {
  const geojson = (donnee.ressources ?? []).some((ressource) => ressource.fichiers.some((fichier) => fichier.format === "geojson"));
  const cles = noms(donnee.versions?.colonnes);
  return geojson || (["lat", "latitude"].some((cle) => cles.has(cle)) && ["lon", "lng", "long", "longitude"].some((cle) => cles.has(cle)));
}

/** Bouton d'action de la carte, à côté de « Télécharger ». */
export function actionVisuelle(donnee: Pick<ResumeDonnee, "ressources" | "versions">): "carte" | "graphique" | null {
  if (aDesCoordonnees(donnee)) return "carte";
  if (estSerieTemporelle(donnee.versions?.colonnes)) return "graphique";
  return null;
}

const entier = (valeur: unknown): number | null => {
  const nombre = typeof valeur === "string" ? Number(valeur) : valeur;
  return typeof nombre === "number" && Number.isFinite(nombre) ? Math.round(nombre) : null;
};

export type Chiffre =
  | { genre: "compte"; nombre: number; unite: string }
  | { genre: "serie"; nombre: number; debut: number | null; fin: number | null };

/**
 * Grand chiffre de la carte. Série temporelle : nombre d'indicateurs et années (`infos_source`, écrit par la
 * synchronisation) ; sinon nombre de lignes et unité devinée du titre (« 586 plages »).
 */
export function chiffreCarte(
  donnee: Pick<ResumeDonnee, "slug" | "versions" | "infos_source">,
  titre: string,
  langue: LangueUnite
): Chiffre | null {
  const infos = donnee.infos_source ?? {};
  if (estSerieTemporelle(donnee.versions?.colonnes)) {
    const nombre = entier(infos.nb_indicateurs) ?? entier(infos.nb_series);
    if (nombre !== null) {
      return {
        genre: "serie",
        nombre,
        debut: entier(infos.premiere_annee_observee),
        fin: entier(infos.derniere_annee_projetee) ?? entier(infos.derniere_annee_observee),
      };
    }
  }
  const lignes = donnee.versions?.nb_lignes;
  return lignes === null || lignes === undefined ? null : { genre: "compte", nombre: lignes, unite: devinerUnite(titre, langue, donnee.slug) };
}

/** Nom de la source, court : avant une parenthèse ou un tiret, 28 caractères au plus. */
export function sourceCourte(nom: string): string {
  const court = nom.split(/\s*\(|\s[-–—]\s/)[0].trim();
  return court.length > 28 ? `${court.slice(0, 27).trimEnd()}…` : court;
}

/** « Libre d'utilisation » : la licence autorise la réutilisation, y compris commerciale. */
export const estLibre = (licence: Pick<Licence, "usage_commercial"> | null | undefined) => licence?.usage_commercial === true;

/** « il y a 2 jours », « aujourd'hui », « il y a 3 mois » dans la langue affichée. */
export function ilYA(date: string, langue: string, maintenant = Date.now()): string | null {
  const instant = Date.parse(date);
  if (Number.isNaN(instant)) return null;
  const jours = Math.max(0, Math.floor((maintenant - instant) / JOUR));
  const format = new Intl.RelativeTimeFormat(langue, { numeric: "auto" });
  if (jours < 30) return format.format(-jours, "day");
  if (jours < 365) return format.format(-Math.floor(jours / 30), "month");
  return format.format(-Math.floor(jours / 365), "year");
}
