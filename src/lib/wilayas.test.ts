import { describe, expect, it } from "vitest";
import {
  chiffresDeLaWilaya,
  classeDeValeur,
  classementMesure,
  MESURE_POPULATION,
  seuilsQuantiles,
  valeurMesure,
  valeursMesure,
  chiffresEssentiels,
  codeDepuisIdentifiant,
  estimee,
  faitsMarquants,
  filtrerWilayas,
  identifiantWilaya,
  nomWilaya,
  populationDeLaWilaya,
  rangDe,
  slugTexte,
  titreSansPays,
  voisines,
  type ChiffresWilayas,
  type DonneeParWilaya,
  type WilayaChiffres,
} from "./wilayas";

const wilaya = (code: string, fr: string, ar: string | null, population: number | null): WilayaChiffres => ({
  code,
  nom: { fr, ar },
  population: population === null ? null : { valeur: population, annee: 2025 },
});

const donnee = (slug: string, comptes: Record<string, number>, source = "geoalgeria"): DonneeParWilaya => ({
  slug,
  titre: { fr: slug },
  categorie_slug: "sante",
  source: { slug: source, nom: source },
  fichier: slug,
  total: Object.values(comptes).reduce((a, b) => a + b, 0),
  sans_wilaya: 0,
  comptes,
});

const wilayas = [wilaya("01", "Adrar", "أدرار", 500_000), wilaya("16", "Alger", "الجزائر", 4_000_000), wilaya("34", "Bordj Bou Arréridj", null, 500_000)];
// Faux référentiel de 12 wilayas pour les faits marquants (10 wilayas couvertes au moins).
const douze = Array.from({ length: 12 }, (_, i) => wilaya(String(i + 1).padStart(2, "0"), `W${i + 1}`, null, 100_000));

const chiffres: ChiffresWilayas = {
  genere_le: "2026-11-16T00:00:00Z",
  complet: true,
  population_source: { slug: "population-wilayas", annee: 2025 },
  wilayas,
  donnees: [donnee("pharmacies", { "01": 10, "16": 400, "34": 40 }), donnee("plages", { "16": 60 }, "openstreetmap"), donnee("ecoles", { "01": 50, "16": 900, "34": 100 })],
};

describe("Ma wilaya en chiffres", () => {
  it("fabrique des identifiants d'URL lisibles", () => {
    expect(slugTexte("Bordj Bou Arréridj")).toBe("bordj-bou-arreridj");
    expect(slugTexte("Aïn Témouchent")).toBe("ain-temouchent");
    expect(slugTexte("M'Sila")).toBe("msila");
    expect(identifiantWilaya(wilayas[2])).toBe("34-bordj-bou-arreridj");
    expect(identifiantWilaya({ code: "07", nom: { fr: "07", ar: null } })).toBe("07");
  });

  it("lit le code de wilaya au début de l'identifiant", () => {
    expect(codeDepuisIdentifiant("16-alger")).toBe("16");
    expect(codeDepuisIdentifiant("9")).toBe("09");
    expect(codeDepuisIdentifiant("09-biskra")).toBe("09");
    expect(codeDepuisIdentifiant("70")).toBeNull();
    expect(codeDepuisIdentifiant("00")).toBeNull();
    expect(codeDepuisIdentifiant("alger")).toBeNull();
    expect(codeDepuisIdentifiant("161")).toBeNull();
    expect(codeDepuisIdentifiant(undefined)).toBeNull();
  });

  it("affiche le nom arabe en arabe, sinon le nom français", () => {
    expect(nomWilaya(wilayas[1], "ar")).toBe("الجزائر");
    expect(nomWilaya(wilayas[2], "ar")).toBe("Bordj Bou Arréridj");
    expect(nomWilaya(wilayas[1], "en")).toBe("Alger");
  });

  it("classe les wilayas avec les ex æquo et les absentes", () => {
    const codes = ["01", "02", "03", "04"];
    expect(rangDe({ "01": 5, "02": 9, "03": 9 }, "02", codes)).toBe(1);
    expect(rangDe({ "01": 5, "02": 9, "03": 9 }, "01", codes)).toBe(3);
    expect(rangDe({ "01": 5, "02": 9, "03": 9 }, "04", codes)).toBe(4);
  });

  it("calcule les chiffres d'une wilaya : rang, part, pour 100 000 habitants", () => {
    const pharmacies = chiffresDeLaWilaya(chiffres, "34").find((c) => c.donnee.slug === "pharmacies")!;
    expect(pharmacies.nombre).toBe(40);
    expect(pharmacies.rang).toBe(2);
    expect(pharmacies.wilayasCouvertes).toBe(3);
    expect(pharmacies.pour100k).toBe(8);
    expect(pharmacies.pour100kNational).toBe(9);
    expect(pharmacies.part).toBeCloseTo(8.89, 1);
    expect(pharmacies.maximum).toBe(400);

    const plages = chiffresDeLaWilaya(chiffres, "01").find((c) => c.donnee.slug === "plages")!;
    expect(plages.nombre).toBe(0);
    expect(plages.rang).toBe(2);
  });

  it("n'affiche pas de moyenne nationale si une population manque", () => {
    const incomplet = { ...chiffres, wilayas: [...wilayas.slice(0, 2), wilaya("34", "Bordj Bou Arréridj", null, null)] };
    const pharmacies = chiffresDeLaWilaya(incomplet, "34").find((c) => c.donnee.slug === "pharmacies")!;
    expect(pharmacies.pour100k).toBeNull();
    expect(pharmacies.pour100kNational).toBeNull();
  });

  it("garde l'ordre des données essentielles", () => {
    expect(chiffresEssentiels(chiffresDeLaWilaya(chiffres, "16")).map((c) => c.donnee.slug)).toEqual(["ecoles", "pharmacies"]);
  });

  it("retient comme faits marquants les tops 3 sur des données assez répandues", () => {
    const comptes = Object.fromEntries(douze.map((w, i) => [w.code, (i + 1) * 10]));
    const jeu: ChiffresWilayas = { ...chiffres, wilayas: douze, donnees: [donnee("ecoles", comptes), donnee("plages", { "12": 5, "11": 2 })] };
    const faits = faitsMarquants(chiffresDeLaWilaya(jeu, "12"));
    expect(faits.map((f) => [f.donnee.slug, f.rang])).toEqual([["ecoles", 1]]);
    expect(faitsMarquants(chiffresDeLaWilaya(jeu, "01"))).toEqual([]);
  });

  it("donne le rang et la part de la population", () => {
    expect(populationDeLaWilaya(chiffres, "16")).toEqual({ valeur: 4_000_000, annee: 2025, rang: 1, part: 80 });
    expect(populationDeLaWilaya({ ...chiffres, wilayas: [wilaya("16", "Alger", null, null)] }, "16")).toBeNull();
  });

  it("passe d'une wilaya à l'autre en boucle", () => {
    expect(voisines(wilayas, "01")).toEqual({ precedente: wilayas[2], suivante: wilayas[1] });
    expect(voisines(wilayas, "99")).toBeNull();
  });

  it("cherche une wilaya par code ou par nom, sans accents", () => {
    expect(filtrerWilayas(wilayas, "16").map((w) => w.code)).toEqual(["16"]);
    expect(filtrerWilayas(wilayas, "arre").map((w) => w.code)).toEqual(["34"]);
    expect(filtrerWilayas(wilayas, "bou").map((w) => w.code)).toEqual(["34"]);
    expect(filtrerWilayas(wilayas, "الجز").map((w) => w.code)).toEqual(["16"]);
    expect(filtrerWilayas(wilayas, "  ")).toHaveLength(3);
  });

  it("retire la mention du pays des titres", () => {
    expect(titreSansPays("Pharmacies d'Algérie")).toBe("Pharmacies");
    expect(titreSansPays("Établissements de santé publique d'Algérie")).toBe("Établissements de santé publique");
    expect(titreSansPays("Séismes en Algérie (catalogue USGS NEIC/PDE)")).toBe("Séismes");
    expect(titreSansPays("Faune d'Algérie — espèces, observations et conservation")).toBe("Faune");
    expect(titreSansPays("Pharmacies of Algeria")).toBe("Pharmacies");
    expect(titreSansPays("صيدليات الجزائر")).toBe("صيدليات");
    expect(titreSansPays("المؤسسات الصحية العمومية الجزائرية")).toBe("المؤسسات الصحية العمومية");
    expect(titreSansPays("Bibliothèques")).toBe("Bibliothèques");
    expect(titreSansPays("Stations-service")).toBe("Stations-service");
  });

  it("marque les données OpenStreetMap comme des estimations", () => {
    expect(estimee(donnee("plages", {}, "openstreetmap"))).toBe(true);
    expect(estimee(donnee("ecoles", {}))).toBe(false);
  });
});

describe("carte colorée des wilayas", () => {
  it("calcule la valeur d'une mesure, au total ou pour 100 000 habitants", () => {
    expect(valeurMesure(chiffres, "16", MESURE_POPULATION, "total")).toBe(4_000_000);
    expect(valeurMesure(chiffres, "16", "pharmacies", "total")).toBe(400);
    expect(valeurMesure(chiffres, "16", "pharmacies", "habitants")).toBe(10);
    expect(valeurMesure(chiffres, "01", "plages", "total")).toBe(0);
    expect(valeurMesure(chiffres, "01", "inconnue", "total")).toBe(0);
    const sansPopulation = { ...chiffres, wilayas: [wilaya("16", "Alger", null, null)] };
    expect(valeurMesure(sansPopulation, "16", "pharmacies", "habitants")).toBe(0);
    expect(valeursMesure(chiffres, "ecoles", "total")).toEqual({ "01": 50, "16": 900, "34": 100 });
  });

  it("répartit les valeurs en classes par quantiles, les zéros à part", () => {
    const seuils = seuilsQuantiles([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(seuils).toEqual([3, 5, 7, 9]);
    expect(classeDeValeur(0, seuils)).toBe(-1);
    expect(classeDeValeur(1, seuils)).toBe(0);
    expect(classeDeValeur(4, seuils)).toBe(1);
    expect(classeDeValeur(10, seuils)).toBe(4);
    expect(seuilsQuantiles([0, 0])).toEqual([]);
    expect(classeDeValeur(5, [])).toBe(0);
  });

  it("classe les wilayas pour une mesure", () => {
    expect(classementMesure(chiffres, "pharmacies", "total", 2).map((l) => [l.wilaya.code, l.valeur])).toEqual([
      ["16", 400],
      ["34", 40],
    ]);
    expect(classementMesure(chiffres, "plages", "total").map((l) => l.wilaya.code)).toEqual(["16"]);
  });
});
