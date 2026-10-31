import { describe, expect, it } from "vitest";
import { devinerUnite, titreCourt, UNITES_PAR_SLUG } from "./deviner-unite";

describe("unité des données connues (table par identifiant)", () => {
  it.each([
    ["mosquees", "mosquées", "mosques", "مساجد"],
    ["gas-stations", "stations", "stations", "محطات"],
    ["poste", "bureaux et GAB", "offices and ATMs", "مكاتب وصرافات"],
    ["divisions-administratives", "communes", "municipalities", "بلديات"],
    ["mobilis", "points de vente", "outlets", "نقاط بيع"],
  ])("%s", (slug, fr, en, ar) => {
    expect(devinerUnite("peu importe", "fr", slug)).toBe(fr);
    expect(devinerUnite("whatever", "en", slug)).toBe(en);
    expect(devinerUnite("أي", "ar", slug)).toBe(ar);
  });

  it("couvre les 33 données du catalogue (hors série du FMI) dans les trois langues", () => {
    expect(Object.keys(UNITES_PAR_SLUG)).toHaveLength(33);
    for (const unites of Object.values(UNITES_PAR_SLUG)) {
      expect(unites.fr && unites.en && unites.ar).toBeTruthy();
    }
  });
});

describe("unité devinée à partir du titre (données nouvelles)", () => {
  it.each([
    ["Plages", "plages"],
    ["Stations-service", "stations"],
    ["Barrages", "barrages"],
    ["Crèches et jardins d'enfants", "crèches"],
    ["Mairies (APC)", "mairies"],
    ["Points relais", "points relais"],
    ["Mosquées d'Algérie", "mosquées"],
    ["Écoles d'Algérie", "écoles"],
    ["Établissements de formation professionnelle d'Algérie", "établissements"],
    ["Gares ferroviaires et de transit d'Algérie", "gares ferroviaires"],
    ["Unités de la Protection Civile d'Algérie", "unités"],
    ["Divisions administratives de l'Algérie (wilayas, daïras, communes)", "éléments"],
    ["Patrimoine culturel d'Algérie", "éléments"],
    ["Population par wilaya", "éléments"],
  ])("« %s » → « %s »", (titre, unite) => {
    expect(devinerUnite(titre, "fr")).toBe(unite);
  });

  it.each([
    ["Algeria mosques", "mosques"],
    ["Football pitches", "football pitches"],
    ["Fuel stations", "fuel stations"],
    ["Algeria post offices & ATMs", "post offices"],
    ["Algeria vocational-training establishments", "vocational establishments"],
    ["Civil protection units of Algeria", "civil protection units"],
    ["Algeria administrative divisions (wilayas, dairas, communes)", "elements"],
    ["Algeria cultural heritage", "elements"],
    ["Algerian economy: IMF figures and forecasts", "elements"],
  ])("en : « %s » → « %s »", (titre, unite) => {
    expect(devinerUnite(titre, "en")).toBe(unite);
  });

  it("garde le premier mot du titre court en arabe, sans l'article", () => {
    expect(devinerUnite("المكتبات", "ar")).toBe("مكتبات");
    expect(devinerUnite("مساجد الجزائر", "ar")).toBe("مساجد");
    expect(devinerUnite("محطات تحلية مياه البحر", "ar")).toBe("محطات");
    expect(devinerUnite("", "ar")).toBe("عناصر");
  });

  it("coupe le titre avant « : », « ( », « , » ou « et »", () => {
    expect(titreCourt("Économie : chiffres et prévisions du FMI")).toBe("Économie");
    expect(titreCourt("Mairies (APC)")).toBe("Mairies");
    expect(titreCourt("Hôpitaux, cliniques")).toBe("Hôpitaux");
  });
});
