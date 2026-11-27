import type { Feature, FeatureCollection, Geometry, GeoJsonObject, MultiPolygon, Polygon, Position } from "geojson";
import { motsDe, normaliser } from "./recherche-rapide";
import { slugTexte } from "./wilayas";

/**
 * Recherche d'une zone sur la carte d'une fiche (wilaya ou commune) : suggestions, filtrage des points dans la zone,
 * masque grisé autour. Contours : fichiers du jeu « divisions-administratives » (un fichier par wilaya avec les
 * polygones de ses communes, `wilaya-boundaries` pour le tracé des wilayas). Fonctions pures, testées.
 */

export interface ZoneWilaya {
  type: "wilaya";
  code: string;
  nom: { fr?: string; ar?: string };
}

export interface ZoneCommune {
  type: "commune";
  /** Code de la wilaya (« 16 »). */
  code: string;
  nom: { fr?: string; ar?: string };
  nomWilaya: { fr?: string; ar?: string };
}

export type Zone = ZoneWilaya | ZoneCommune;

/** Commune telle que la donne le fichier `communes` (JSON) de `divisions-administratives`. */
export interface CommuneBrute {
  commune_name_fr?: string;
  commune_name_ar?: string;
  wilaya_code?: number | string;
  wilaya_name_fr?: string;
  wilaya_name_ar?: string;
}

export const codeDeuxChiffres = (code: unknown): string | null => {
  const texte = String(code ?? "").trim();
  return /^\d{1,2}$/.test(texte) && Number(texte) >= 1 && Number(texte) <= 69 ? texte.padStart(2, "0") : null;
};

/** Liste des communes, sans doublon ni ligne incomplète. */
export function communesDepuisListe(liste: CommuneBrute[]): ZoneCommune[] {
  const vues = new Set<string>();
  const communes: ZoneCommune[] = [];
  for (const brute of liste) {
    const code = codeDeuxChiffres(brute.wilaya_code);
    const fr = brute.commune_name_fr?.trim();
    if (!code || !fr) continue;
    const cle = `${code}:${normaliser(fr)}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    communes.push({
      type: "commune",
      code,
      nom: { fr, ar: brute.commune_name_ar?.trim() || undefined },
      nomWilaya: { fr: brute.wilaya_name_fr?.trim() || undefined, ar: brute.wilaya_name_ar?.trim() || undefined },
    });
  }
  return communes;
}

/** Nom affiché : arabe en arabe s'il existe, sinon le français. */
export const nomZone = (nom: { fr?: string; ar?: string }, langue: string) => (langue === "ar" && nom.ar ? nom.ar : nom.fr ?? nom.ar ?? "");

const correspond = (noms: (string | undefined)[], recherche: string[]) => {
  const mots = noms.filter((nom): nom is string => Boolean(nom)).flatMap(motsDe);
  return recherche.every((mot) => mots.some((candidat) => candidat.startsWith(mot)));
};

const commencePar = (noms: (string | undefined)[], recherche: string[]) =>
  noms.some((nom) => nom && normaliser(nom).replace(/['’-]/g, " ").startsWith(recherche.join(" ")));

/**
 * Suggestions : wilayas d'abord (numéro « 16 » ou début des mots du nom), puis communes, toutes langues,
 * sans casse ni accents ; les noms qui commencent par la recherche passent devant.
 */
export function chercherZones(terme: string, wilayas: ZoneWilaya[], communes: ZoneCommune[], max = 7): Zone[] {
  const brut = terme.trim();
  if (!brut) return [];
  if (/^\d{1,2}$/.test(brut)) {
    const code = brut.padStart(2, "0");
    return wilayas.filter((wilaya) => wilaya.code === code).slice(0, 1);
  }
  const recherche = motsDe(brut);
  if (recherche.length === 0) return [];
  const classer = <T extends Zone>(liste: T[]) =>
    liste
      .filter((zone) => correspond([zone.nom.fr, zone.nom.ar], recherche))
      .map((zone) => ({ zone, rang: commencePar([zone.nom.fr, zone.nom.ar], recherche) ? 0 : 1 }))
      .sort((a, b) => a.rang - b.rang || (a.zone.nom.fr ?? "").localeCompare(b.zone.nom.fr ?? ""))
      .map((resultat) => resultat.zone);
  const trouveesWilayas = classer(wilayas).slice(0, 3);
  return [...trouveesWilayas, ...classer(communes)].slice(0, max);
}

/** Identifiant de zone pour l'adresse : `?zone=16` (wilaya) ou `?zone=16-bab-ezzouar` (commune). */
export const identifiantZone = (zone: Zone) => (zone.type === "wilaya" ? zone.code : `${zone.code}-${slugTexte(zone.nom.fr ?? "")}`);

export function zoneDepuisIdentifiant(identifiant: string | null, wilayas: ZoneWilaya[], communes: ZoneCommune[]): Zone | null {
  if (!identifiant) return null;
  const [debut, ...reste] = identifiant.split("-");
  const code = codeDeuxChiffres(debut);
  if (!code) return null;
  if (reste.length === 0) return wilayas.find((wilaya) => wilaya.code === code) ?? null;
  const slug = reste.join("-");
  return communes.find((commune) => commune.code === code && slugTexte(commune.nom.fr ?? "") === slug) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------------------------

type Surface = Polygon | MultiPolygon;

const estSurface = (geometrie: Geometry | null | undefined): geometrie is Surface =>
  geometrie?.type === "Polygon" || geometrie?.type === "MultiPolygon";

/** Point dans un anneau (lancer de rayon). */
function dansAnneau(x: number, y: number, anneau: Position[]): boolean {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi, yi] = anneau[i];
    const [xj, yj] = anneau[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Point dans un polygone ou un multipolygone (trous compris). */
export function pointDansSurface(longitude: number, latitude: number, surface: Surface): boolean {
  const polygones = surface.type === "Polygon" ? [surface.coordinates] : surface.coordinates;
  return polygones.some(
    ([exterieur, ...trous]) => exterieur && dansAnneau(longitude, latitude, exterieur) && !trous.some((trou) => dansAnneau(longitude, latitude, trou))
  );
}

/** Contours retenus pour une zone, avec leur rectangle englobant (test rapide avant le calcul exact). */
export interface ContourZone {
  surfaces: Surface[];
  boite: [number, number, number, number];
  /** Wilaya : un point qui porte son code de wilaya est classé d'après ce code (plus sûr près des côtes). */
  codeWilaya?: string;
}

export function contourDepuisSurfaces(surfaces: Surface[], codeWilaya?: string): ContourZone | null {
  if (surfaces.length === 0) return null;
  const boite: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const surface of surfaces) {
    const polygones = surface.type === "Polygon" ? [surface.coordinates] : surface.coordinates;
    for (const [x, y] of polygones.flatMap((polygone) => polygone[0] ?? [])) {
      boite[0] = Math.min(boite[0], x);
      boite[1] = Math.min(boite[1], y);
      boite[2] = Math.max(boite[2], x);
      boite[3] = Math.max(boite[3], y);
    }
  }
  return { surfaces, boite, codeWilaya };
}

/** Polygones des communes d'une wilaya : toute la wilaya, ou la seule commune demandée (même nom, sans casse ni accents). */
export function surfacesDeZone(communesWilaya: FeatureCollection, zone: Zone): Surface[] {
  const cible = zone.type === "commune" ? normaliser(zone.nom.fr ?? "") : null;
  return communesWilaya.features
    .filter((feature) => estSurface(feature.geometry))
    .filter((feature) => cible === null || normaliser(String(feature.properties?.name_fr ?? "")) === cible)
    .map((feature) => feature.geometry as Surface);
}

const CLES_CODE_WILAYA = ["code_wilaya", "wilaya_code"];

function codeWilayaDe(proprietes: Record<string, unknown> | null | undefined): string | null {
  for (const cle of CLES_CODE_WILAYA) {
    const code = codeDeuxChiffres(proprietes?.[cle]);
    if (code) return code;
  }
  return null;
}

/** Premier point d'une géométrie : sert à classer une ligne ou une surface dans une zone. */
function premierPoint(geometrie: Geometry): Position | null {
  switch (geometrie.type) {
    case "Point":
      return geometrie.coordinates;
    case "MultiPoint":
    case "LineString":
      return geometrie.coordinates[0] ?? null;
    case "MultiLineString":
    case "Polygon":
      return geometrie.coordinates[0]?.[0] ?? null;
    case "MultiPolygon":
      return geometrie.coordinates[0]?.[0]?.[0] ?? null;
    default:
      return null;
  }
}

export function estDansZone(feature: Feature, contour: ContourZone): boolean {
  if (!feature.geometry) return false;
  if (contour.codeWilaya) {
    const code = codeWilayaDe(feature.properties);
    if (code) return code === contour.codeWilaya;
  }
  const point = premierPoint(feature.geometry);
  if (!point) return false;
  const [x, y] = point;
  const [ouest, sud, est, nord] = contour.boite;
  if (x < ouest || x > est || y < sud || y > nord) return false;
  return contour.surfaces.some((surface) => pointDansSurface(x, y, surface));
}

const estCollection = (donnees: GeoJsonObject): donnees is FeatureCollection =>
  donnees.type === "FeatureCollection" && Array.isArray((donnees as FeatureCollection).features);

const estPonctuel = (feature: Feature) => feature.geometry?.type === "Point" || feature.geometry?.type === "MultiPoint";

/** Données réduites à la zone, et nombre de points gardés. */
export function filtrerDansZone(donnees: GeoJsonObject, contour: ContourZone): { donnees: GeoJsonObject; points: number } {
  if (!estCollection(donnees)) return { donnees, points: 0 };
  const features = donnees.features.filter((feature) => estDansZone(feature, contour));
  const filtrees: FeatureCollection = { ...donnees, features };
  return { donnees: filtrees, points: features.filter(estPonctuel).length };
}

/** Nombre de points d'une collection (sans filtre). */
export const nombrePoints = (donnees: GeoJsonObject) => (estCollection(donnees) ? donnees.features.filter(estPonctuel).length : 0);

/** Voile grisé sur tout le reste du monde : un grand rectangle percé par les contours de la zone. */
export function masqueHorsZone(contour: ContourZone): Feature<Polygon> {
  const monde: Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];
  const trous = contour.surfaces.flatMap((surface) =>
    (surface.type === "Polygon" ? [surface.coordinates] : surface.coordinates).map((polygone) => polygone[0]).filter(Boolean)
  );
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [monde, ...trous] } };
}
