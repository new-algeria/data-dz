/**
 * Tracé SVG des 69 wilayas à partir des contours GeoAlgeria (`wilaya-boundaries`), partagé par toutes les cartes
 * « Ma wilaya ». Projection plane corrigée de la latitude moyenne de l'Algérie (les distances est-ouest restent justes).
 */

export interface ContourGeoJson {
  properties: { code?: string | number; wilaya_code?: string | number } & Record<string, unknown>;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

export interface CheminWilaya {
  code: string;
  d: string;
  /** Centre et taille de l'emprise : repère visible pour les petites wilayas (Alger, Blida…). */
  centre: [number, number];
  taille: number;
}

export const LARGEUR_CARTE = 600;
const COS_LATITUDE = Math.cos((28 * Math.PI) / 180);

type Anneau = number[][];

const codeDe = (contour: ContourGeoJson) => String(contour.properties.code ?? contour.properties.wilaya_code ?? "").padStart(2, "0");
const polygonesDe = (contour: ContourGeoJson): Anneau[][] =>
  contour.geometry.type === "Polygon" ? [contour.geometry.coordinates as Anneau[]] : (contour.geometry.coordinates as Anneau[][]);

export function tracerWilayas(contours: ContourGeoJson[], largeur = LARGEUR_CARTE): { chemins: CheminWilaya[]; hauteur: number } {
  let ouest = Infinity;
  let est = -Infinity;
  let sud = Infinity;
  let nord = -Infinity;
  for (const contour of contours)
    for (const polygone of polygonesDe(contour))
      for (const [x, y] of polygone[0]) {
        ouest = Math.min(ouest, x);
        est = Math.max(est, x);
        sud = Math.min(sud, y);
        nord = Math.max(nord, y);
      }
  const echelle = largeur / ((est - ouest) * COS_LATITUDE);
  const hauteur = (nord - sud) * echelle;
  const projeter = ([x, y]: number[]) => [(x - ouest) * COS_LATITUDE * echelle, (nord - y) * echelle];
  const point = (position: number[]) => projeter(position).map((v) => v.toFixed(1)).join(",");
  const chemins = contours.map((contour) => {
    const polygones = polygonesDe(contour);
    const sommets = polygones.flatMap((polygone) => polygone[0].map(projeter));
    const xs = sommets.map(([x]) => x);
    const ys = sommets.map(([, y]) => y);
    return {
      code: codeDe(contour),
      d: polygones.flatMap((polygone) => polygone.map((anneau) => `M${anneau.map(point).join("L")}Z`)).join(""),
      centre: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2] as [number, number],
      taille: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)),
    };
  });
  return { chemins, hauteur };
}
