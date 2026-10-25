import type { FeatureCollection, Point } from "geojson";
import type { Fichier } from "./types";

// Détection automatique du visuel d'une fiche (carte ou graphique), uniquement à partir de ses fichiers.
// Tout est pur : aucune requête, aucun accès au DOM. Le chargement des fichiers est fait par les hooks.

/** Au-delà, un fichier n'est jamais téléchargé pour le visuel (ni sur la fiche, ni dans le catalogue). */
export const TAILLE_MAX_VISUEL = 5 * 1024 * 1024;
/** Nombre maximal de séries proposées dans le sélecteur (colonnes catégorie) ; les wilayas vont jusqu'à 69. */
export const MAX_SERIES = 50;
export const MAX_SERIES_WILAYAS = 69;
/** Barres horizontales : les plus grandes valeurs seulement. */
export const TOP_BARRES = 15;
/** Multi-séries (format large) : colonnes cochées au départ. */
export const MESURES_COCHEES = 3;

export type Ligne = Record<string, unknown>;

export type VisuelCarte =
  | { genre: "points"; origine: "geojson"; fichierId: string }
  | { genre: "points"; origine: "json"; fichierId: string; latitude: string; longitude: string }
  | { genre: "wilayas"; fichierId: string; code: string; nom: string | null; mesures: string[]; temps: string | null; unite: string | null };

export type VisuelGraphique =
  | {
      genre: "courbe";
      fichierId: string;
      temps: string;
      /** Colonnes catégorie dont la combinaison forme une série (vide : une seule série par mesure). */
      dimensions: string[];
      mesures: string[];
      /** Colonne dont la valeur « projection » marque la partie projetée. */
      type: string | null;
      unite: string | null;
    }
  | { genre: "barres"; fichierId: string; categorie: string; mesures: string[]; unite: string | null };

export interface DetectionVisuel {
  carte: VisuelCarte | null;
  graphique: VisuelGraphique | null;
}

/** Visuel affiché par défaut : la carte d'abord, sinon le graphique. */
export const visuelParDefaut = (detection: DetectionVisuel): "carte" | "graphique" | null =>
  detection.carte ? "carte" : detection.graphique ? "graphique" : null;

// ---------------------------------------------------------------------------------------------
// Choix des fichiers
// ---------------------------------------------------------------------------------------------

const formatDe = (fichier: Fichier) => fichier.format.toLowerCase();
const utilisable = (fichier: Fichier) => fichier.taille_octets === null || fichier.taille_octets <= TAILLE_MAX_VISUEL;

/** GeoJSON de la carte : le principal, sinon le premier (fichiers de plus de 5 Mo ignorés). */
export function choisirFichierCarte(fichiers: Fichier[]): Fichier | null {
  const candidats = fichiers.filter((fichier) => formatDe(fichier) === "geojson" && utilisable(fichier));
  return candidats.find((fichier) => fichier.principal) ?? candidats[0] ?? null;
}

/** JSON du graphique : le principal, sinon le plus léger (fichiers de plus de 5 Mo ignorés). */
export function choisirFichierGraphique(fichiers: Fichier[]): Fichier | null {
  const candidats = fichiers.filter((fichier) => formatDe(fichier) === "json" && utilisable(fichier));
  const principal = candidats.find((fichier) => fichier.principal);
  if (principal) return principal;
  return [...candidats].sort((a, b) => (a.taille_octets ?? Infinity) - (b.taille_octets ?? Infinity))[0] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Lecture du contenu
// ---------------------------------------------------------------------------------------------

const estObjet = (valeur: unknown): valeur is Ligne => typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);

// Clés sous lesquelles un fichier range habituellement ses lignes ({ data: [...] }…).
const CLES_LIGNES = ["data", "donnees", "records", "items", "rows", "results", "resultats", "observations", "values", "valeurs", "features"];

/** Lignes d'un fichier JSON : tableau d'objets, objet qui en contient un, ou propriétés d'un GeoJSON. */
export function extraireLignes(contenu: unknown): Ligne[] | null {
  let tableau: unknown[] | null = null;
  if (Array.isArray(contenu)) tableau = contenu;
  else if (estObjet(contenu)) {
    const listes = Object.entries(contenu).filter(([, valeur]) => Array.isArray(valeur) && valeur.some(estObjet)) as [string, unknown[]][];
    const preferee = CLES_LIGNES.map((cle) => listes.find(([nom]) => nom.toLowerCase() === cle)).find(Boolean);
    tableau = (preferee ?? [...listes].sort((a, b) => b[1].length - a[1].length)[0])?.[1] ?? null;
  }
  if (!tableau) return null;
  const objets = tableau.filter(estObjet);
  if (objets.length === 0 || objets.length < tableau.length / 2) return null;
  // GeoJSON : on lit les propriétés de chaque entité.
  return objets.map((objet) => (objet.type === "Feature" && estObjet(objet.properties) ? objet.properties : objet));
}

/** « Année de référence » → « annee_de_reference » : comparaisons de noms de colonnes sans accents ni casse. */
export const normaliserCle = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Nombre lu dans une cellule (nombre, ou texte « 12 », « -3.5 », « 4,2 ») ; null sinon. */
export function lireNombre(valeur: unknown): number | null {
  if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : null;
  if (typeof valeur === "string" && /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(valeur)) return Number(valeur.trim().replace(",", "."));
  return null;
}

const vide = (valeur: unknown) => valeur === null || valeur === undefined || valeur === "";

// ---------------------------------------------------------------------------------------------
// Rôles des colonnes
// ---------------------------------------------------------------------------------------------

const NOMS_TEMPS = new Set(["annee", "year", "an", "date", "mois", "month", "periode", "period", "trimestre", "quarter"]);
const NOMS_LATITUDE = new Set(["lat", "latitude"]);
const NOMS_LONGITUDE = new Set(["lon", "lng", "long", "longitude"]);
const NOMS_CODE_WILAYA = new Set(["code_wilaya", "wilaya_code", "code_w", "id_wilaya", "wilaya_id", "num_wilaya", "numero_wilaya", "matricule"]);
const NOMS_NOM_WILAYA = new Set(["wilaya", "nom_wilaya", "wilaya_nom", "wilaya_name", "name_wilaya", "wilaya_fr", "nom_wilaya_fr"]);
const NOMS_UNITE = new Set(["unite", "unit", "unites", "units", "unite_mesure"]);
const NOMS_TYPE = new Set(["type", "statut", "nature", "type_valeur", "type_donnee", "type_observation"]);
const NOMS_VALEUR = new Set(["valeur", "value", "val", "montant", "total", "effectif"]);
// Jamais tracées : identifiants, codes, coordonnées.
const MOTIF_EXCLU = /^(id|fid|gid|objectid|ogc_fid|osm_id|uuid|x|y|lat|lng|lon|long|latitude|longitude)$|(^|_)(id|code|codes|cle|key|ref|refs|iso|iso2|iso3|matricule)(_|$)/;
// Textes libres, jamais pris comme catégorie.
const MOTIF_TEXTE_LIBRE = /(^|_)(description|note|notes|commentaire|commentaires|remarque|source|sources|url|lien|liens|adresse|address|email|telephone|phone)(_|$)/;

interface InfoColonne {
  nom: string;
  cle: string;
  nbValeurs: number;
  nbNombres: number;
  distincts: Set<string>;
  longueurMoyenne: number;
}

const LIMITE_DISTINCTS = 2000;

function analyserColonnes(lignes: Ligne[]): InfoColonne[] {
  const infos = new Map<string, InfoColonne & { longueurTotale: number; nbTextes: number }>();
  for (const ligne of lignes) {
    for (const [nom, valeur] of Object.entries(ligne)) {
      let info = infos.get(nom);
      if (!info) {
        info = { nom, cle: normaliserCle(nom), nbValeurs: 0, nbNombres: 0, distincts: new Set(), longueurMoyenne: 0, longueurTotale: 0, nbTextes: 0 };
        infos.set(nom, info);
      }
      if (vide(valeur) || typeof valeur === "object") continue;
      info.nbValeurs++;
      if (lireNombre(valeur) !== null) info.nbNombres++;
      const texte = String(valeur);
      if (info.distincts.size < LIMITE_DISTINCTS) info.distincts.add(texte);
      info.longueurTotale += texte.length;
      info.nbTextes++;
    }
  }
  return [...infos.values()].map((info) => ({ ...info, longueurMoyenne: info.nbTextes ? info.longueurTotale / info.nbTextes : 0 }));
}

const estNumerique = (info: InfoColonne) => info.nbValeurs > 0 && info.nbNombres / info.nbValeurs >= 0.9;
const proportion = (info: InfoColonne, test: (texte: string) => boolean) => {
  const valeurs = [...info.distincts];
  return valeurs.length > 0 && valeurs.filter(test).length / valeurs.length >= 0.9;
};

/** Valeur de temps lue dans une cellule : clé de tri et libellé (année, date ISO, mois). */
export function lireTemps(valeur: unknown): { tri: number; etiquette: string } | null {
  if (vide(valeur)) return null;
  const nombre = lireNombre(valeur);
  if (nombre !== null && Number.isInteger(nombre) && nombre >= 1 && nombre <= 2200) return { tri: nombre, etiquette: String(nombre) };
  const texte = String(valeur).trim();
  const date = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(texte);
  if (date) {
    const [, annee, mois = "01", jour = "01"] = date;
    const tri = Date.UTC(Number(annee), Number(mois) - 1, Number(jour));
    if (Number.isNaN(tri)) return null;
    return { tri, etiquette: date[0] };
  }
  return null;
}

const estColonneTemps = (info: InfoColonne) =>
  (NOMS_TEMPS.has(info.cle) || /^(annee|year|date)_/.test(info.cle)) && proportion(info, (texte) => lireTemps(texte) !== null);

const dansIntervalle = (min: number, max: number) => (texte: string) => {
  const nombre = lireNombre(texte);
  return nombre !== null && nombre >= min && nombre <= max;
};

export interface RolesColonnes {
  temps: string | null;
  latitude: string | null;
  longitude: string | null;
  codeWilaya: string | null;
  nomWilaya: string | null;
  unite: string | null;
  type: string | null;
  mesures: string[];
  dimensions: string[];
  /** Colonne texte pour des barres (catégorie possiblement nombreuse : on ne garde que le top 15). */
  categorie: string | null;
}

/** Rôle de chaque colonne : temps, coordonnées, wilaya, unité, projection, mesures et catégories. */
export function analyserRoles(lignes: Ligne[]): RolesColonnes {
  const infos = analyserColonnes(lignes);
  const trouver = (test: (info: InfoColonne) => boolean) => infos.find(test)?.nom ?? null;

  const temps = trouver(estColonneTemps);
  const latitude = trouver((info) => NOMS_LATITUDE.has(info.cle) && estNumerique(info) && proportion(info, dansIntervalle(-90, 90)));
  const longitude = trouver((info) => NOMS_LONGITUDE.has(info.cle) && estNumerique(info) && proportion(info, dansIntervalle(-180, 180)));
  const codeWilaya = trouver(
    (info) => (NOMS_CODE_WILAYA.has(info.cle) || info.cle === "wilaya") && proportion(info, (texte) => Number.isInteger(lireNombre(texte)) && dansIntervalle(1, 69)(texte))
  );
  const nomWilaya = trouver((info) => NOMS_NOM_WILAYA.has(info.cle) && info.nom !== codeWilaya && !estNumerique(info));
  const unite = trouver((info) => NOMS_UNITE.has(info.cle) && !estNumerique(info));
  const type = trouver((info) => NOMS_TYPE.has(info.cle) && [...info.distincts].some((texte) => estProjection(texte)));

  const reserves = new Set([temps, latitude, longitude, codeWilaya, unite, type].filter((nom): nom is string => nom !== null));
  const libres = infos.filter((info) => !reserves.has(info.nom) && !MOTIF_EXCLU.test(info.cle) && info.nbValeurs > 0);

  const numeriques = libres.filter((info) => estNumerique(info) && info.distincts.size > 1);
  const parValeur = numeriques.filter((info) => NOMS_VALEUR.has(info.cle));
  const textes = libres.filter((info) => !estNumerique(info) && !MOTIF_TEXTE_LIBRE.test(info.cle) && info.longueurMoyenne <= 80);

  const dimensions = textes
    .filter((info) => {
      const max = info.nom === nomWilaya ? MAX_SERIES_WILAYAS : MAX_SERIES;
      return info.distincts.size >= 2 && info.distincts.size <= max;
    })
    .map((info) => info.nom);

  // Format long (catégorie + « valeur ») : seule la colonne valeur est tracée, la catégorie choisit la série.
  const mesures = (dimensions.length > 0 && parValeur.length > 0 ? parValeur : [...parValeur, ...numeriques.filter((info) => !parValeur.includes(info))]).map(
    (info) => info.nom
  );

  const categorie =
    nomWilaya ?? dimensions[0] ?? textes.find((info) => info.distincts.size >= 2 && info.longueurMoyenne <= 60)?.nom ?? null;

  return { temps, latitude, longitude, codeWilaya, nomWilaya, unite, type, mesures, dimensions, categorie };
}

export const estProjection = (valeur: unknown) => typeof valeur === "string" && /projection|projete|projet[ée]|prevision|prévision|forecast/i.test(valeur);

// ---------------------------------------------------------------------------------------------
// Détection
// ---------------------------------------------------------------------------------------------

/** Visuels possibles pour des lignes JSON (sans tenir compte des GeoJSON du jeu). */
export function detecterDepuisLignes(lignes: Ligne[], fichierId: string): DetectionVisuel {
  if (lignes.length === 0) return { carte: null, graphique: null };
  const roles = analyserRoles(lignes);

  let carte: VisuelCarte | null = null;
  if (roles.latitude && roles.longitude) {
    carte = { genre: "points", origine: "json", fichierId, latitude: roles.latitude, longitude: roles.longitude };
  } else if (roles.codeWilaya && roles.mesures.length > 0 && roles.dimensions.every((dimension) => dimension === roles.nomWilaya)) {
    carte = { genre: "wilayas", fichierId, code: roles.codeWilaya, nom: roles.nomWilaya, mesures: roles.mesures, temps: roles.temps, unite: roles.unite };
  }

  let graphique: VisuelGraphique | null = null;
  if (roles.mesures.length > 0) {
    const nbTemps = roles.temps ? new Set(lignes.map((ligne) => lireTemps(ligne[roles.temps as string])?.etiquette).filter(Boolean)).size : 0;
    if (roles.temps && nbTemps >= 2) {
      // Le nom de wilaya sert de série ; à défaut, le code (01 à 69).
      const dimensions = roles.dimensions.length > 0 ? roles.dimensions : roles.codeWilaya ? [roles.codeWilaya] : [];
      graphique = { genre: "courbe", fichierId, temps: roles.temps, dimensions, mesures: roles.mesures, type: roles.type, unite: roles.unite };
    } else if (!roles.temps && roles.categorie) {
      graphique = { genre: "barres", fichierId, categorie: roles.categorie, mesures: roles.mesures, unite: roles.unite };
    }
  }
  return { carte, graphique };
}

/**
 * Règle de priorité : un GeoJSON (ou des coordonnées / codes de wilaya dans le JSON) donne une carte ;
 * le JSON « graphiquable » donne un graphique. Les deux peuvent coexister (la carte est montrée d'abord).
 */
export function detecterVisuel(fichiers: Fichier[], contenuJson: unknown | null): DetectionVisuel {
  const fichierCarte = choisirFichierCarte(fichiers);
  const fichierJson = choisirFichierGraphique(fichiers);
  const lignes = fichierJson && contenuJson !== null ? extraireLignes(contenuJson) : null;
  const depuisJson = lignes && fichierJson ? detecterDepuisLignes(lignes, fichierJson.id) : { carte: null, graphique: null };
  return {
    carte: fichierCarte ? { genre: "points", origine: "geojson", fichierId: fichierCarte.id } : depuisJson.carte,
    graphique: depuisJson.graphique,
  };
}

// ---------------------------------------------------------------------------------------------
// Données des visuels
// ---------------------------------------------------------------------------------------------

/** « dette_publique_brute » → « Dette publique brute ». */
export function libelleColonne(nom: string): string {
  const texte = nom.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Lignes avec coordonnées → GeoJSON de points (les autres colonnes deviennent les propriétés). */
export function pointsDepuisLignes(lignes: Ligne[], latitude: string, longitude: string): FeatureCollection<Point> {
  const features = lignes.flatMap((ligne) => {
    const lat = lireNombre(ligne[latitude]);
    const lon = lireNombre(ligne[longitude]);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
    return [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [lon, lat] }, properties: ligne }];
  });
  return { type: "FeatureCollection", features };
}

const SEPARATEUR_SERIE = " · ";
const cleSerie = (ligne: Ligne, dimensions: string[]) => dimensions.map((dimension) => String(ligne[dimension] ?? "")).join(SEPARATEUR_SERIE);

export interface OptionSerie {
  cle: string;
  libelle: string;
}

/** Séries d'une courbe en format long, triées par libellé (la première est la série par défaut). */
export function optionsSeries(lignes: Ligne[], dimensions: string[], langue = "fr"): OptionSerie[] {
  if (dimensions.length === 0) return [];
  const cles = new Set<string>();
  for (const ligne of lignes) if (dimensions.every((dimension) => !vide(ligne[dimension]))) cles.add(cleSerie(ligne, dimensions));
  const collateur = new Intl.Collator(langue, { sensitivity: "base", numeric: true });
  return [...cles].map((cle) => ({ cle, libelle: cle })).sort((a, b) => collateur.compare(a.libelle, b.libelle));
}

export interface PointCourbe {
  temps: string;
  tri: number;
  [serie: string]: number | string | null;
}

export interface SerieCourbe {
  /** Clé des valeurs observées dans les points ; `${cle}_p` pour la partie projetée. */
  cle: string;
  mesure: string;
  libelle: string;
  aProjection: boolean;
}

export interface DonneesCourbe {
  points: PointCourbe[];
  series: SerieCourbe[];
  periode: [string, string] | null;
  unite: string | null;
}

/**
 * Points d'une courbe : lignes filtrées sur la série choisie, regroupées par temps (somme des doublons),
 * valeurs projetées rangées à part pour être tracées en pointillés, raccordées au dernier point observé.
 */
export function donneesCourbe(
  lignes: Ligne[],
  visuel: Extract<VisuelGraphique, { genre: "courbe" }>,
  choix: { serie: string | null; mesures: string[] }
): DonneesCourbe {
  const filtrees = visuel.dimensions.length > 0 && choix.serie !== null ? lignes.filter((ligne) => cleSerie(ligne, visuel.dimensions) === choix.serie) : lignes;
  const series: SerieCourbe[] = choix.mesures.map((mesure, indice) => ({
    cle: `s${indice}`,
    mesure,
    libelle: libelleColonne(mesure),
    aProjection: false,
  }));

  const parTemps = new Map<string, PointCourbe>();
  let unite: string | null = null;
  for (const ligne of filtrees) {
    const temps = lireTemps(ligne[visuel.temps]);
    if (!temps) continue;
    const projete = visuel.type !== null && estProjection(ligne[visuel.type]);
    if (unite === null && visuel.unite && !vide(ligne[visuel.unite])) unite = String(ligne[visuel.unite]);
    let point = parTemps.get(temps.etiquette);
    if (!point) {
      point = { temps: temps.etiquette, tri: temps.tri };
      parTemps.set(temps.etiquette, point);
    }
    for (const serie of series) {
      const valeur = lireNombre(ligne[serie.mesure]);
      if (valeur === null) continue;
      const cle = projete ? `${serie.cle}_p` : serie.cle;
      point[cle] = ((point[cle] as number | null | undefined) ?? 0) + valeur;
      if (projete) serie.aProjection = true;
    }
  }

  const points = [...parTemps.values()].sort((a, b) => a.tri - b.tri);
  // Raccord : le dernier point observé commence aussi la partie projetée, pour une ligne continue.
  for (const serie of series) {
    if (!serie.aProjection) continue;
    const premierProjete = points.findIndex((point) => typeof point[`${serie.cle}_p`] === "number");
    for (let indice = premierProjete - 1; indice >= 0; indice--) {
      if (typeof points[indice][serie.cle] === "number") {
        points[indice][`${serie.cle}_p`] = points[indice][serie.cle];
        break;
      }
    }
  }

  const avecValeurs = points.filter((point) => series.some((serie) => typeof point[serie.cle] === "number" || typeof point[`${serie.cle}_p`] === "number"));
  const periode: [string, string] | null = avecValeurs.length > 0 ? [avecValeurs[0].temps, avecValeurs[avecValeurs.length - 1].temps] : null;
  return { points: avecValeurs, series, periode, unite };
}

/** Titre automatique : « Dette publique brute, 1980-2031 ». */
export function titreCourbe(nom: string, periode: [string, string] | null): string {
  if (!periode) return nom;
  const [debut, fin] = periode;
  return debut === fin ? `${nom}, ${debut}` : `${nom}, ${debut}-${fin}`;
}

export interface Barre {
  categorie: string;
  valeur: number;
}

/** Top 15 des catégories (somme des doublons), de la plus grande à la plus petite valeur. */
export function donneesBarres(lignes: Ligne[], categorie: string, mesure: string): Barre[] {
  const totaux = new Map<string, number>();
  for (const ligne of lignes) {
    const valeur = lireNombre(ligne[mesure]);
    if (valeur === null || vide(ligne[categorie])) continue;
    const nom = String(ligne[categorie]);
    totaux.set(nom, (totaux.get(nom) ?? 0) + valeur);
  }
  return [...totaux.entries()]
    .map(([nom, valeur]) => ({ categorie: nom, valeur }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, TOP_BARRES);
}

/** Valeurs de temps distinctes (années…), de la plus ancienne à la plus récente. */
export function valeursTemps(lignes: Ligne[], temps: string): string[] {
  const vues = new Map<string, number>();
  for (const ligne of lignes) {
    const valeur = lireTemps(ligne[temps]);
    if (valeur) vues.set(valeur.etiquette, valeur.tri);
  }
  return [...vues.entries()].sort((a, b) => a[1] - b[1]).map(([etiquette]) => etiquette);
}

/** Code de wilaya sur deux chiffres (« 1 », 1, « 01 » → « 01 ») ; null hors de 01 à 69. */
export function codeWilaya(valeur: unknown): string | null {
  const nombre = lireNombre(valeur);
  if (nombre === null || !Number.isInteger(nombre) || nombre < 1 || nombre > 69) return null;
  return String(nombre).padStart(2, "0");
}

/** Valeur par wilaya pour la carte (somme si plusieurs lignes), filtrée sur la période choisie. */
export function valeursWilayas(
  lignes: Ligne[],
  visuel: Extract<VisuelCarte, { genre: "wilayas" }>,
  choix: { mesure: string; temps: string | null }
): Map<string, number> {
  const valeurs = new Map<string, number>();
  for (const ligne of lignes) {
    if (visuel.temps && choix.temps !== null && lireTemps(ligne[visuel.temps])?.etiquette !== choix.temps) continue;
    const code = codeWilaya(ligne[visuel.code]);
    const valeur = lireNombre(ligne[choix.mesure]);
    if (code === null || valeur === null) continue;
    valeurs.set(code, (valeurs.get(code) ?? 0) + valeur);
  }
  return valeurs;
}

// ---------------------------------------------------------------------------------------------
// Miniature du catalogue
// ---------------------------------------------------------------------------------------------

export type Miniature = { genre: "courbe"; valeurs: number[] } | { genre: "points"; points: [number, number][] };

const MAX_POINTS_MINIATURE = 400;
const MAX_VALEURS_SPARKLINE = 60;
/** Emprise de l'Algérie [ouest, sud, est, nord] : cadre de la miniature et de la carte. */
export const EMPRISE_ALGERIE: [number, number, number, number] = [-8.7, 18.9, 12, 37.2];

/** Coordonnées des points d'un GeoJSON (premier sommet des autres géométries), échantillonnées. */
export function coordonneesGeojson(contenu: unknown): [number, number][] {
  const features = estObjet(contenu) && Array.isArray(contenu.features) ? contenu.features : [];
  const coordonnees: [number, number][] = [];
  for (const feature of features) {
    let geometrie = estObjet(feature) && estObjet(feature.geometry) ? feature.geometry.coordinates : null;
    while (Array.isArray(geometrie) && Array.isArray(geometrie[0])) geometrie = geometrie[0];
    if (Array.isArray(geometrie) && typeof geometrie[0] === "number" && typeof geometrie[1] === "number") coordonnees.push([geometrie[0], geometrie[1]]);
  }
  return coordonnees;
}

const echantillonner = <T>(valeurs: T[], max: number): T[] =>
  valeurs.length <= max ? valeurs : Array.from({ length: max }, (_, indice) => valeurs[Math.floor((indice * valeurs.length) / max)]);

/** Points ramenés dans le cadre de l'Algérie (0 à 1, nord en haut) pour la miniature. */
export function miniaturePoints(coordonnees: [number, number][]): Miniature | null {
  const [ouest, sud, est, nord] = EMPRISE_ALGERIE;
  const dedans = coordonnees.filter(([lon, lat]) => lon >= ouest && lon <= est && lat >= sud && lat <= nord);
  if (dedans.length === 0) return null;
  const points = echantillonner(dedans, MAX_POINTS_MINIATURE).map(
    ([lon, lat]) => [Math.round(((lon - ouest) / (est - ouest)) * 1000) / 1000, Math.round(((nord - lat) / (nord - sud)) * 1000) / 1000] as [number, number]
  );
  return { genre: "points", points };
}

/** Sparkline : la série par défaut du graphique (première série, ou première mesure). */
export function miniatureGraphique(lignes: Ligne[], visuel: VisuelGraphique): Miniature | null {
  let valeurs: number[] = [];
  if (visuel.genre === "courbe") {
    const serie = optionsSeries(lignes, visuel.dimensions)[0]?.cle ?? null;
    const { points, series } = donneesCourbe(lignes, visuel, { serie, mesures: visuel.mesures.slice(0, 1) });
    const cle = series[0]?.cle;
    valeurs = points
      .map((point) => (typeof point[cle] === "number" ? point[cle] : point[`${cle}_p`]))
      .filter((valeur): valeur is number => typeof valeur === "number");
  } else {
    valeurs = donneesBarres(lignes, visuel.categorie, visuel.mesures[0]).map((barre) => barre.valeur);
  }
  if (valeurs.length < 2) return null;
  return { genre: "courbe", valeurs: echantillonner(valeurs, MAX_VALEURS_SPARKLINE) };
}
