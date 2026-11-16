import { appelerApi } from "./api";
import type { TexteMultilingue } from "./types";

/**
 * « Ma wilaya en chiffres » : chiffres de toutes les données par wilaya (API `/v1/wilayas`, une seule requête,
 * en cache 6 h), puis tout est calculé dans le navigateur : chiffres d'une wilaya, rangs, comparaison par habitant.
 */

export interface PopulationWilaya {
  valeur: number;
  annee: number;
}

export interface WilayaChiffres {
  code: string;
  nom: { fr: string; ar: string | null };
  population: PopulationWilaya | null;
}

export interface DonneeParWilaya {
  slug: string;
  titre: TexteMultilingue;
  categorie_slug: string | null;
  source: { slug: string; nom: string } | null;
  fichier: string;
  total: number;
  sans_wilaya: number;
  comptes: Record<string, number>;
}

export interface ChiffresWilayas {
  genere_le: string;
  complet: boolean;
  population_source: { slug: string; annee: number | null } | null;
  wilayas: WilayaChiffres[];
  donnees: DonneeParWilaya[];
}

export const chargerChiffresWilayas = () => appelerApi<ChiffresWilayas>("/v1/wilayas");

export const NB_WILAYAS = 69;

/** Sources dont les lieux sont recensés par des bénévoles : leurs chiffres sont des estimations. */
const SOURCES_ESTIMEES = new Set(["openstreetmap", "osm"]);

/**
 * Données mises en avant en haut de la page, dans cet ordre (celles qui parlent à tout le monde).
 * Les autres apparaissent dans « Toutes les données ».
 */
export const DONNEES_ESSENTIELLES = [
  "ecoles",
  "pharmacies",
  "cliniques",
  "sante",
  "mosquees",
  "bibliotheques",
  "enseignement-superieur",
  "formation-professionnelle",
  "gas-stations",
  "banques",
  "sports",
  "culture",
] as const;

/** Partie lisible d'une URL : « Bordj Bou Arréridj » → « bordj-bou-arreridj ». */
export function slugTexte(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Identifiant d'URL d'une wilaya : « 34-bordj-bou-arreridj ». */
export const identifiantWilaya = (wilaya: Pick<WilayaChiffres, "code" | "nom">) => {
  const nom = slugTexte(wilaya.nom.fr);
  return nom && nom !== wilaya.code ? `${wilaya.code}-${nom}` : wilaya.code;
};

/** Code de wilaya lu au début d'un identifiant d'URL (« 16-alger », « 16 », « 9 » → « 09 »), ou `null`. */
export function codeDepuisIdentifiant(identifiant: string | undefined): string | null {
  const chiffres = /^(\d{1,2})(?:-|$)/.exec(identifiant ?? "")?.[1];
  if (!chiffres) return null;
  const n = Number(chiffres);
  return n >= 1 && n <= NB_WILAYAS ? String(n).padStart(2, "0") : null;
}

/** Titre d'une donnée sans la mention du pays (« Pharmacies d'Algérie » → « Pharmacies »), pour les cartes et les faits. */
export function titreSansPays(titre: string): string {
  const court = titre
    .split(/\s+[:(–—]\s*|\s+-\s+/)[0]
    .replace(/\s+(?:d['’]|de l['’]|en |of |in )(?:l['’])?alg[ée]ri(?:e|a)\b.*$/i, "")
    .replace(/\s+(?:في\s+)?الجزائر(?:\s.*)?$/u, "")
    .replace(/\s+(?:الجزائري|الجزائرية|للجزائر)(?:\s.*)?$/u, "")
    .replace(/^alg[ée]ri(?:e|a)(?:'s)?\s*:?\s*/i, "")
    .trim();
  return court ? court.charAt(0).toLocaleUpperCase() + court.slice(1) : titre;
}

/** Nom affiché d'une wilaya : arabe en arabe (s'il existe), sinon le nom français (repris en anglais). */
export const nomWilaya = (wilaya: Pick<WilayaChiffres, "nom">, langue: string) =>
  langue === "ar" && wilaya.nom.ar ? wilaya.nom.ar : wilaya.nom.fr;

/** Rang parmi les 69 wilayas (1 = la plus grande valeur ; ex æquo = même rang ; une wilaya absente vaut 0). */
export function rangDe(valeurs: Record<string, number>, code: string, codes: string[]): number {
  const valeur = valeurs[code] ?? 0;
  return 1 + codes.filter((autre) => (valeurs[autre] ?? 0) > valeur).length;
}

export const estimee = (donnee: Pick<DonneeParWilaya, "source">) => SOURCES_ESTIMEES.has(donnee.source?.slug ?? "");

export interface ChiffreWilaya {
  donnee: DonneeParWilaya;
  nombre: number;
  rang: number;
  /** Nombre de wilayas qui en ont au moins un (le rang n'a de sens que parmi elles). */
  wilayasCouvertes: number;
  /** Pour 100 000 habitants, dans la wilaya et en moyenne nationale (si les populations sont connues). */
  pour100k: number | null;
  pour100kNational: number | null;
  /** Part du total national, en pourcentage. */
  part: number;
  /** Plus grande valeur parmi les wilayas (pour la longueur des barres). */
  maximum: number;
}

/** Chiffres de chaque donnée pour une wilaya. */
export function chiffresDeLaWilaya(chiffres: ChiffresWilayas, code: string): ChiffreWilaya[] {
  const codes = chiffres.wilayas.map((wilaya) => wilaya.code);
  const population = chiffres.wilayas.find((wilaya) => wilaya.code === code)?.population?.valeur ?? null;
  const populationTotale = chiffres.wilayas.reduce((somme, wilaya) => somme + (wilaya.population?.valeur ?? 0), 0);
  const populationsCompletes = chiffres.wilayas.every((wilaya) => wilaya.population);

  return chiffres.donnees.map((donnee) => {
    const nombre = donnee.comptes[code] ?? 0;
    return {
      donnee,
      nombre,
      rang: rangDe(donnee.comptes, code, codes),
      wilayasCouvertes: codes.filter((autre) => (donnee.comptes[autre] ?? 0) > 0).length,
      pour100k: population ? (nombre / population) * 100_000 : null,
      pour100kNational: populationsCompletes && populationTotale > 0 ? (donnee.total / populationTotale) * 100_000 : null,
      part: donnee.total > 0 ? (nombre / donnee.total) * 100 : 0,
      maximum: Math.max(0, ...Object.values(donnee.comptes)),
    };
  });
}

/** Les chiffres essentiels, dans l'ordre de `DONNEES_ESSENTIELLES` (seulement ceux que l'API a comptés). */
export function chiffresEssentiels(liste: ChiffreWilaya[]): ChiffreWilaya[] {
  const parSlug = new Map(liste.map((chiffre) => [chiffre.donnee.slug, chiffre]));
  return DONNEES_ESSENTIELLES.map((slug) => parSlug.get(slug)).filter((chiffre): chiffre is ChiffreWilaya => Boolean(chiffre));
}

/**
 * Faits marquants : les données où la wilaya est dans le top 3 (avec au moins 3 éléments et 10 wilayas couvertes,
 * pour éviter les « 1re sur 2 »), les plus nettes d'abord. Au plus `nombre`.
 */
export function faitsMarquants(liste: ChiffreWilaya[], nombre = 4): ChiffreWilaya[] {
  return liste
    .filter((chiffre) => chiffre.rang <= 3 && chiffre.nombre >= 3 && chiffre.wilayasCouvertes >= 10)
    .sort((a, b) => a.rang - b.rang || b.part - a.part)
    .slice(0, nombre);
}

/** Population : rang de la wilaya et part de la population nationale. */
export function populationDeLaWilaya(chiffres: ChiffresWilayas, code: string): { valeur: number; annee: number; rang: number; part: number } | null {
  const wilaya = chiffres.wilayas.find((w) => w.code === code);
  if (!wilaya?.population) return null;
  const valeurs = Object.fromEntries(chiffres.wilayas.filter((w) => w.population).map((w) => [w.code, w.population!.valeur]));
  const total = Object.values(valeurs).reduce((somme, valeur) => somme + valeur, 0);
  return {
    ...wilaya.population,
    rang: rangDe(valeurs, code, chiffres.wilayas.map((w) => w.code)),
    part: total > 0 ? (wilaya.population.valeur / total) * 100 : 0,
  };
}

/** Wilayas précédente et suivante (par code, en boucle), pour passer de l'une à l'autre. */
export function voisines(wilayas: WilayaChiffres[], code: string): { precedente: WilayaChiffres; suivante: WilayaChiffres } | null {
  const indice = wilayas.findIndex((wilaya) => wilaya.code === code);
  if (indice < 0 || wilayas.length < 2) return null;
  return {
    precedente: wilayas[(indice - 1 + wilayas.length) % wilayas.length],
    suivante: wilayas[(indice + 1) % wilayas.length],
  };
}

/** Recherche dans la liste des wilayas : code (« 16 ») ou début d'un mot du nom, sans accents ni casse, en fr et en ar. */
export function filtrerWilayas(wilayas: WilayaChiffres[], terme: string): WilayaChiffres[] {
  const recherche = slugTexte(terme);
  const brut = terme.trim();
  if (!recherche && !brut) return wilayas;
  return wilayas.filter((wilaya) => {
    if (/^\d{1,2}$/.test(brut)) return wilaya.code === brut.padStart(2, "0");
    const mots = slugTexte(wilaya.nom.fr).split("-");
    return (recherche && (slugTexte(wilaya.nom.fr).startsWith(recherche) || mots.some((mot) => mot.startsWith(recherche)))) || (wilaya.nom.ar ?? "").includes(brut);
  });
}
