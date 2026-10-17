import type { GeoJsonObject, Geometry, Position } from "geojson";

export type Emprise = [number, number, number, number];

function parcourirPositions(geometrie: Geometry | null, visiter: (position: Position) => void) {
  if (!geometrie) return;
  switch (geometrie.type) {
    case "Point":
      visiter(geometrie.coordinates);
      break;
    case "MultiPoint":
    case "LineString":
      geometrie.coordinates.forEach(visiter);
      break;
    case "MultiLineString":
    case "Polygon":
      geometrie.coordinates.forEach((ligne) => ligne.forEach(visiter));
      break;
    case "MultiPolygon":
      geometrie.coordinates.forEach((polygone) => polygone.forEach((ligne) => ligne.forEach(visiter)));
      break;
    case "GeometryCollection":
      geometrie.geometries.forEach((sousGeometrie) => parcourirPositions(sousGeometrie, visiter));
      break;
  }
}

/** Emprise [ouest, sud, est, nord] d'un GeoJSON, ou `null` s'il ne contient aucune coordonnée. */
export function calculerEmprise(geojson: GeoJsonObject): Emprise | null {
  const emprise: Emprise = [Infinity, Infinity, -Infinity, -Infinity];
  const etendre = ([longitude, latitude]: Position) => {
    emprise[0] = Math.min(emprise[0], longitude);
    emprise[1] = Math.min(emprise[1], latitude);
    emprise[2] = Math.max(emprise[2], longitude);
    emprise[3] = Math.max(emprise[3], latitude);
  };

  if (geojson.type === "FeatureCollection") {
    (geojson as GeoJSON.FeatureCollection).features.forEach((entite) => parcourirPositions(entite.geometry, etendre));
  } else if (geojson.type === "Feature") {
    parcourirPositions((geojson as GeoJSON.Feature).geometry, etendre);
  } else {
    parcourirPositions(geojson as Geometry, etendre);
  }

  return Number.isFinite(emprise[0]) ? emprise : null;
}
