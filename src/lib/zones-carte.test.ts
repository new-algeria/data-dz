import { describe, expect, it } from "vitest";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import {
  chercherZones,
  communesDepuisListe,
  contourDepuisSurfaces,
  estDansZone,
  filtrerDansZone,
  identifiantZone,
  masqueHorsZone,
  pointDansSurface,
  surfacesDeZone,
  zoneDepuisIdentifiant,
  type ZoneWilaya,
} from "./zones-carte";

const carre = (x: number, y: number, cote: number): Polygon => ({
  type: "Polygon",
  coordinates: [[[x, y], [x + cote, y], [x + cote, y + cote], [x, y + cote], [x, y]]],
});

const wilayas: ZoneWilaya[] = [
  { type: "wilaya", code: "16", nom: { fr: "Alger", ar: "الجزائر" } },
  { type: "wilaya", code: "31", nom: { fr: "Oran", ar: "وهران" } },
  { type: "wilaya", code: "34", nom: { fr: "Bordj Bou Arréridj", ar: "برج بوعريريج" } },
];
const communes = communesDepuisListe([
  { commune_name_fr: "Bab Ezzouar", commune_name_ar: "باب الزوار", wilaya_code: 16, wilaya_name_fr: "Alger" },
  { commune_name_fr: "Bab El Oued", commune_name_ar: "باب الوادي", wilaya_code: 16, wilaya_name_fr: "Alger" },
  { commune_name_fr: "Bab Ezzouar", wilaya_code: "16" },
  { commune_name_fr: "Oran", wilaya_code: 31, wilaya_name_fr: "Oran" },
  { commune_name_fr: "", wilaya_code: 31 },
]);

describe("communesDepuisListe", () => {
  it("retire doublons et lignes incomplètes", () => {
    expect(communes).toHaveLength(3);
    expect(communes[0]).toMatchObject({ type: "commune", code: "16", nom: { fr: "Bab Ezzouar", ar: "باب الزوار" } });
  });
});

describe("chercherZones", () => {
  it("numéro de wilaya", () => {
    expect(chercherZones("31", wilayas, communes)).toEqual([wilayas[1]]);
  });
  it("wilayas d'abord, puis communes", () => {
    expect(chercherZones("oran", wilayas, communes).map((zone) => zone.type)).toEqual(["wilaya", "commune"]);
  });
  it("début des mots, sans accents, en arabe aussi", () => {
    expect(chercherZones("bab ez", wilayas, communes).map((zone) => zone.nom.fr)).toEqual(["Bab Ezzouar"]);
    expect(chercherZones("bordj arreridj", wilayas, communes)[0].nom.fr).toBe("Bordj Bou Arréridj");
    expect(chercherZones("الوادي", wilayas, communes)[0].nom.fr).toBe("Bab El Oued");
  });
  it("rien pour une recherche vide", () => {
    expect(chercherZones("  ", wilayas, communes)).toEqual([]);
  });
});

describe("identifiants de zone", () => {
  it("aller-retour wilaya et commune", () => {
    expect(identifiantZone(wilayas[0])).toBe("16");
    expect(identifiantZone(communes[0])).toBe("16-bab-ezzouar");
    expect(zoneDepuisIdentifiant("16-bab-ezzouar", wilayas, communes)).toEqual(communes[0]);
    expect(zoneDepuisIdentifiant("16", wilayas, communes)).toEqual(wilayas[0]);
    expect(zoneDepuisIdentifiant("99", wilayas, communes)).toBeNull();
    expect(zoneDepuisIdentifiant(null, wilayas, communes)).toBeNull();
  });
});

describe("géométrie", () => {
  const troue: Polygon = { type: "Polygon", coordinates: [carre(0, 0, 10).coordinates[0], carre(4, 4, 2).coordinates[0]] };
  it("point dans un polygone, hors d'un trou", () => {
    expect(pointDansSurface(1, 1, troue)).toBe(true);
    expect(pointDansSurface(5, 5, troue)).toBe(false);
    expect(pointDansSurface(11, 1, troue)).toBe(false);
    expect(pointDansSurface(21, 21, { type: "MultiPolygon", coordinates: [carre(0, 0, 1).coordinates, carre(20, 20, 2).coordinates] })).toBe(true);
  });

  const collectionCommunes: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { name_fr: "Bab Ezzouar" }, geometry: carre(0, 0, 1) },
      { type: "Feature", properties: { name_fr: "Bab El Oued" }, geometry: carre(1, 0, 1) },
    ],
  };
  it("polygones de la commune ou de toute la wilaya", () => {
    expect(surfacesDeZone(collectionCommunes, communes[0])).toHaveLength(1);
    expect(surfacesDeZone(collectionCommunes, wilayas[0])).toHaveLength(2);
  });

  const point = (x: number, y: number, proprietes: Record<string, unknown> = {}): Feature => ({
    type: "Feature",
    properties: proprietes,
    geometry: { type: "Point", coordinates: [x, y] },
  });

  it("le code de wilaya du point l'emporte sur sa position (côtes)", () => {
    const contour = contourDepuisSurfaces(surfacesDeZone(collectionCommunes, wilayas[0]), "16")!;
    expect(estDansZone(point(5, 5, { code_wilaya: "16" }), contour)).toBe(true);
    expect(estDansZone(point(0.5, 0.5, { wilaya_code: 31 }), contour)).toBe(false);
    expect(estDansZone(point(0.5, 0.5), contour)).toBe(true);
  });

  it("filtre et compte les points de la zone", () => {
    const contour = contourDepuisSurfaces(surfacesDeZone(collectionCommunes, communes[0]))!;
    const donnees: FeatureCollection = { type: "FeatureCollection", features: [point(0.5, 0.5), point(1.5, 0.5), point(0.2, 0.9)] };
    const resultat = filtrerDansZone(donnees, contour);
    expect(resultat.points).toBe(2);
    expect((resultat.donnees as FeatureCollection).features).toHaveLength(2);
  });

  it("voile percé par la zone", () => {
    const masque = masqueHorsZone(contourDepuisSurfaces([carre(0, 0, 1)])!);
    expect(masque.geometry.coordinates).toHaveLength(2);
  });
});
