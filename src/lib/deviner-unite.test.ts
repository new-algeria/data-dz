import { describe, expect, it } from "vitest";
import { devinerUnite, titreCourt } from "./deviner-unite";

describe("unité devinée à partir du titre", () => {
  it.each([
    ["Plages", "plages"],
    ["Stations-service", "stations"],
    ["Barrages", "barrages"],
    ["Crèches et jardins d'enfants", "crèches"],
    ["Mairies (APC)", "mairies"],
    ["Points relais", "points relais"],
    ["Les pharmacies de garde", "pharmacies de garde"],
    ["Divisions administratives", "éléments"],
    ["Population par wilaya et par année", "éléments"],
    ["Liste complète des aéroports d'Algérie", "éléments"],
  ])("« %s » → « %s »", (titre, unite) => {
    expect(devinerUnite(titre, "fr")).toBe(unite);
  });

  it("marche en anglais, avec son propre repli", () => {
    expect(devinerUnite("Beaches", "en")).toBe("beaches");
    expect(devinerUnite("The gas stations: brands and LPG", "en")).toBe("gas stations");
    expect(devinerUnite("Schools and kindergartens", "en")).toBe("schools");
    expect(devinerUnite("Administrative divisions", "en")).toBe("elements");
    expect(devinerUnite("Unemployment rate", "en")).toBe("elements");
  });

  it("garde le premier mot du titre court en arabe", () => {
    expect(devinerUnite("الشواطئ", "ar")).toBe("الشواطئ");
    expect(devinerUnite("محطات الخدمة: العلامات", "ar")).toBe("محطات");
    expect(devinerUnite("", "ar")).toBe("عناصر");
  });

  it("coupe le titre avant « : », « ( », « , » ou « et »", () => {
    expect(titreCourt("Économie : chiffres et prévisions du FMI")).toBe("Économie");
    expect(titreCourt("Mairies (APC)")).toBe("Mairies");
    expect(titreCourt("Hôpitaux, cliniques")).toBe("Hôpitaux");
    expect(titreCourt("Gares - SNTF")).toBe("Gares");
  });
});
