import { describe, expect, it } from "vitest";
import {
  analyserRoles,
  choisirFichierCarte,
  choisirFichierGraphique,
  codeWilaya,
  detecterDepuisLignes,
  detecterVisuel,
  donneesBarres,
  donneesCourbe,
  extraireLignes,
  miniatureGraphique,
  miniaturePoints,
  optionsSeries,
  pointsDepuisLignes,
  titreCourbe,
  valeursTemps,
  valeursWilayas,
  visuelParDefaut,
  type Ligne,
  type VisuelCarte,
  type VisuelGraphique,
} from "./detecterVisuel";
import type { Fichier } from "./types";

// ------------------------------------------------------------------------------------------------
// Échantillons aux formats des vrais fichiers (valeurs fictives)
// ------------------------------------------------------------------------------------------------

const fichier = (nom: string, format: string, taille: number | null, principal = false): Fichier => ({
  id: `${nom}.${format}`,
  nom,
  format,
  principal,
  taille_octets: taille,
  url: `https://api.exemple/${nom}.${format}`,
  url_telechargement: `https://api.exemple/${nom}.${format}?download=1`,
});

// FMI, format long avec observations et projections
const fmi: Ligne[] = ["Dette publique brute", "Inflation, prix moyens", "Croissance du PIB réel"].flatMap((indicateur, i) =>
  Array.from({ length: 52 }, (_, k) => ({
    annee: 1980 + k,
    indicateur,
    code_indicateur: ["GGXWDG_NGDP", "PCPIPCH", "NGDP_RPCH"][i],
    valeur: 20 + i * 3 + k * 0.5,
    unite: i === 0 ? "% du PIB" : "%",
    type: 1980 + k > 2025 ? "projection" : "observation",
  }))
);

// Banque mondiale, format long multi-pays
const banqueMondiale: Ligne[] = ["Algérie", "Maroc", "Tunisie"].flatMap((pays, i) =>
  ["Population totale", "PIB (US$ courants)"].flatMap((indicateur) =>
    Array.from({ length: 10 }, (_, k) => ({
      pays,
      code_pays: ["DZA", "MAR", "TUN"][i],
      indicateur,
      code_indicateur: indicateur.startsWith("Pop") ? "SP.POP.TOTL" : "NY.GDP.MKTP.CD",
      annee: String(2014 + k),
      valeur: (i + 1) * 1000 + k,
    }))
  )
);

// Canicules par wilaya et par année
const NOMS = ["Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna"];
const canicules: Ligne[] = NOMS.flatMap((wilaya, i) =>
  Array.from({ length: 5 }, (_, k) => ({ code_wilaya: String(i + 1).padStart(2, "0"), wilaya, annee: 2020 + k, nb_jours_canicule: 10 * (i + 1) + k }))
);

// FMI, format large (une colonne par indicateur)
const fmiParAnnee: Ligne[] = Array.from({ length: 12 }, (_, k) => ({
  annee: 2020 + k,
  pib_milliards_usd: 150 + k * 10,
  croissance_pib_reel: 3 + k * 0.1,
  inflation: 5 - k * 0.2,
  chomage: 12 - k * 0.1,
  dette_publique: 50 + k,
  type: 2020 + k > 2025 ? "Projection" : "Observation",
}));

// Pharmacies (GeoAlgeria) : coordonnées et code de wilaya, aucune mesure
const pharmacies: Ligne[] = Array.from({ length: 30 }, (_, k) => ({
  id: `01-${String(k).padStart(5, "0")}`,
  name: `Pharmacie ${k}`,
  wilaya_code: String((k % 48) + 1).padStart(2, "0"),
  commune_code: "0112",
  commune: k % 2 ? "Aoulef" : "Adrar",
  lat: 26.9 + k * 0.1,
  lng: 1.07 + k * 0.05,
  geo_precision: "exact",
}));

// ------------------------------------------------------------------------------------------------

describe("choix des fichiers", () => {
  it("prend le GeoJSON principal, sinon le premier, en ignorant ceux de plus de 5 Mo", () => {
    expect(choisirFichierCarte([fichier("a", "geojson", 100), fichier("b", "geojson", 200, true)])?.nom).toBe("b");
    expect(choisirFichierCarte([fichier("gros", "geojson", 6e6, true), fichier("petit", "geojson", 200)])?.nom).toBe("petit");
    expect(choisirFichierCarte([fichier("gros", "geojson", 6e6)])).toBeNull();
  });

  it("prend le JSON principal, sinon le plus léger", () => {
    expect(choisirFichierGraphique([fichier("a", "json", 900), fichier("b", "json", 100), fichier("c", "csv", 10)])?.nom).toBe("b");
    expect(choisirFichierGraphique([fichier("a", "json", 900, true), fichier("b", "json", 100)])?.nom).toBe("a");
    expect(choisirFichierGraphique([fichier("a", "json", 6e6, true), fichier("b", "json", 7e6)])).toBeNull();
  });
});

describe("lecture du contenu", () => {
  it("lit un tableau, un objet qui contient les lignes, ou les propriétés d'un GeoJSON", () => {
    expect(extraireLignes([{ a: 1 }, { a: 2 }])).toHaveLength(2);
    expect(extraireLignes({ metadata: { titre: "x" }, data: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(extraireLignes({ type: "FeatureCollection", features: [{ type: "Feature", properties: { nom: "A" }, geometry: null }] })).toEqual([{ nom: "A" }]);
    expect(extraireLignes("texte")).toBeNull();
    expect(extraireLignes([1, 2, 3])).toBeNull();
  });

  it("normalise les codes de wilaya", () => {
    expect(codeWilaya(1)).toBe("01");
    expect(codeWilaya("7")).toBe("07");
    expect(codeWilaya("58")).toBe("58");
    expect(codeWilaya(70)).toBeNull();
  });
});

describe("FMI (format long, observations et projections)", () => {
  const { graphique, carte } = detecterDepuisLignes(fmi, "fmi.json");

  it("donne une courbe avec une série par indicateur", () => {
    expect(carte).toBeNull();
    expect(graphique).toMatchObject({ genre: "courbe", temps: "annee", dimensions: ["indicateur"], mesures: ["valeur"], type: "type", unite: "unite" });
  });

  it("propose les séries par ordre alphabétique (la première est celle par défaut)", () => {
    expect(optionsSeries(fmi, ["indicateur"]).map((option) => option.libelle)).toEqual([
      "Croissance du PIB réel",
      "Dette publique brute",
      "Inflation, prix moyens",
    ]);
  });

  it("sépare la partie projetée et la raccorde au dernier point observé", () => {
    const courbe = donneesCourbe(fmi, graphique as Extract<VisuelGraphique, { genre: "courbe" }>, { serie: "Dette publique brute", mesures: ["valeur"] });
    expect(courbe.periode).toEqual(["1980", "2031"]);
    expect(courbe.unite).toBe("% du PIB");
    expect(courbe.series[0].aProjection).toBe(true);
    const p2025 = courbe.points.find((point) => point.temps === "2025");
    const p2026 = courbe.points.find((point) => point.temps === "2026");
    expect(p2025?.s0).toBe(42.5);
    expect(p2025?.s0_p).toBe(42.5);
    expect(p2026?.s0).toBeUndefined();
    expect(p2026?.s0_p).toBe(43);
    expect(titreCourbe("Dette publique brute", courbe.periode)).toBe("Dette publique brute, 1980-2031");
  });
});

describe("Banque mondiale (format long, plusieurs pays)", () => {
  it("combine pays et indicateur pour former les séries", () => {
    const { graphique } = detecterDepuisLignes(banqueMondiale, "bm.json");
    expect(graphique).toMatchObject({ genre: "courbe", dimensions: ["pays", "indicateur"], mesures: ["valeur"] });
    const options = optionsSeries(banqueMondiale, ["pays", "indicateur"]);
    expect(options).toHaveLength(6);
    expect(options[0].libelle).toBe("Algérie · PIB (US$ courants)");
    const courbe = donneesCourbe(banqueMondiale, graphique as Extract<VisuelGraphique, { genre: "courbe" }>, { serie: options[0].cle, mesures: ["valeur"] });
    expect(courbe.points).toHaveLength(10);
    expect(courbe.points[0]).toMatchObject({ temps: "2014", s0: 1000 });
  });

  it("ne trace jamais les codes", () => {
    const roles = analyserRoles(banqueMondiale);
    expect(roles.mesures).not.toContain("code_pays");
    expect(roles.dimensions).not.toContain("code_indicateur");
  });
});

describe("Canicules par wilaya", () => {
  const detection = detecterDepuisLignes(canicules, "canicules.json");

  it("donne une carte des wilayas et une courbe par wilaya", () => {
    expect(detection.carte).toMatchObject({ genre: "wilayas", code: "code_wilaya", nom: "wilaya", mesures: ["nb_jours_canicule"], temps: "annee" });
    expect(detection.graphique).toMatchObject({ genre: "courbe", dimensions: ["wilaya"], mesures: ["nb_jours_canicule"] });
    expect(visuelParDefaut(detection)).toBe("carte");
    expect(optionsSeries(canicules, ["wilaya"])[0].libelle).toBe("Adrar");
  });

  it("donne la valeur de chaque wilaya pour l'année choisie", () => {
    const carte = detection.carte as Extract<VisuelCarte, { genre: "wilayas" }>;
    expect(valeursTemps(canicules, "annee")).toEqual(["2020", "2021", "2022", "2023", "2024"]);
    const valeurs = valeursWilayas(canicules, carte, { mesure: "nb_jours_canicule", temps: "2024" });
    expect(valeurs.get("01")).toBe(14);
    expect(valeurs.get("05")).toBe(54);
    expect(valeurs.size).toBe(5);
  });
});

describe("FMI par année (format large)", () => {
  it("donne une courbe multi-séries, une par colonne numérique", () => {
    const { graphique } = detecterDepuisLignes(fmiParAnnee, "fmi-large.json");
    expect(graphique).toMatchObject({ genre: "courbe", dimensions: [], type: "type" });
    expect((graphique as Extract<VisuelGraphique, { genre: "courbe" }>).mesures).toEqual([
      "pib_milliards_usd",
      "croissance_pib_reel",
      "inflation",
      "chomage",
      "dette_publique",
    ]);
    const courbe = donneesCourbe(fmiParAnnee, graphique as Extract<VisuelGraphique, { genre: "courbe" }>, {
      serie: null,
      mesures: ["inflation", "chomage"],
    });
    expect(courbe.series.map((serie) => serie.libelle)).toEqual(["Inflation", "Chomage"]);
    expect(courbe.series.every((serie) => serie.aProjection)).toBe(true);
  });
});

describe("Pharmacies (GeoJSON + coordonnées dans le JSON)", () => {
  const fichiers = [fichier("pharmacies", "geojson", 2_500_000, true), fichier("pharmacies", "json", 1_800_000, true)];

  it("préfère le GeoJSON pour la carte, sans graphique", () => {
    expect(detecterVisuel(fichiers, pharmacies)).toEqual({ carte: { genre: "points", origine: "geojson", fichierId: "pharmacies.geojson" }, graphique: null });
  });

  it("sans GeoJSON, place les points à partir de lat / lng", () => {
    const detection = detecterVisuel([fichiers[1]], pharmacies);
    expect(detection.carte).toEqual({ genre: "points", origine: "json", fichierId: "pharmacies.json", latitude: "lat", longitude: "lng" });
    const geojson = pointsDepuisLignes(pharmacies, "lat", "lng");
    expect(geojson.features).toHaveLength(30);
    expect(geojson.features[0].geometry.coordinates).toEqual([1.07, 26.9]);
  });

  it("ne prend jamais identifiants, codes ni coordonnées comme mesures", () => {
    expect(analyserRoles(pharmacies).mesures).toEqual([]);
  });
});

describe("Barres et jeux sans visuel", () => {
  it("donne des barres (top 15) pour catégorie + nombre sans temps", () => {
    const lignes = Array.from({ length: 20 }, (_, k) => ({ commune: `Commune ${k}`, nombre_ecoles: k * 3 }));
    const { graphique } = detecterDepuisLignes(lignes, "ecoles.json");
    expect(graphique).toMatchObject({ genre: "barres", categorie: "commune", mesures: ["nombre_ecoles"] });
    const barres = donneesBarres(lignes, "commune", "nombre_ecoles");
    expect(barres).toHaveLength(15);
    expect(barres[0]).toEqual({ categorie: "Commune 19", valeur: 57 });
  });

  it("ne donne rien pour des données uniquement textuelles", () => {
    const lignes = [
      { nom: "A", adresse: "rue 1" },
      { nom: "B", adresse: "rue 2" },
    ];
    expect(detecterVisuel([fichier("liste", "json", 100)], lignes)).toEqual({ carte: null, graphique: null });
    expect(visuelParDefaut({ carte: null, graphique: null })).toBeNull();
  });

  it("ne donne rien sans fichier utilisable", () => {
    expect(detecterVisuel([fichier("gros", "json", 9e6)], null)).toEqual({ carte: null, graphique: null });
  });
});

describe("miniatures du catalogue", () => {
  it("résume une courbe en valeurs et une carte en points dans le cadre de l'Algérie", () => {
    const { graphique } = detecterDepuisLignes(fmi, "fmi.json");
    const sparkline = miniatureGraphique(fmi, graphique as VisuelGraphique);
    expect(sparkline?.genre).toBe("courbe");
    expect(sparkline && sparkline.genre === "courbe" && sparkline.valeurs.length).toBe(52);

    const points = miniaturePoints([
      [3, 36.7],
      [-100, 40],
    ]);
    expect(points).toEqual({ genre: "points", points: [[0.565, 0.027]] });
  });
});

describe("unités", () => {
  it("lit la colonne unite, sinon la déduit du nom de la mesure", async () => {
    const { uniteDepuisMesure, premiereValeur } = await import("./detecterVisuel");
    expect(uniteDepuisMesure("nb_jours", null)).toBe("jours");
    expect(uniteDepuisMesure("nombre_de_lits", null)).toBe("lits");
    expect(uniteDepuisMesure("valeur", "% du PIB")).toBe("% du PIB");
    expect(uniteDepuisMesure("pib", null)).toBeNull();
    expect(premiereValeur(fmi, "unite")).toBe("% du PIB");
  });
});
