import { describe, expect, it } from "vitest";
import { alternativesLangues, langueDeLAdresse, localeOpenGraph, rechercheApresChangement, urlCanonique, urlEnLangue } from "./langues-seo";

describe("langueDeLAdresse", () => {
  it("lit ?lng=, sans casse ni région", () => {
    expect(langueDeLAdresse("?lng=ar")).toBe("ar");
    expect(langueDeLAdresse("?q=eau&lng=EN-us")).toBe("en");
  });
  it("ignore une langue inconnue ou absente", () => {
    expect(langueDeLAdresse("?lng=de")).toBeNull();
    expect(langueDeLAdresse("")).toBeNull();
  });
});

describe("urlEnLangue et alternativesLangues", () => {
  it("adresse de chaque version", () => {
    expect(urlEnLangue("/datasets/eau", "fr")).toBe("https://www.data-dz.com/datasets/eau?lng=fr");
    expect(urlEnLangue("", null)).toBe("https://www.data-dz.com/");
  });
  it("trois langues et x-default", () => {
    expect(alternativesLangues("/wilayas/16-alger")).toEqual([
      { hreflang: "fr", href: "https://www.data-dz.com/wilayas/16-alger?lng=fr" },
      { hreflang: "en", href: "https://www.data-dz.com/wilayas/16-alger?lng=en" },
      { hreflang: "ar", href: "https://www.data-dz.com/wilayas/16-alger?lng=ar" },
      { hreflang: "x-default", href: "https://www.data-dz.com/wilayas/16-alger" },
    ]);
  });
});

describe("urlCanonique", () => {
  it("sans langue imposée : adresse nue", () => {
    expect(urlCanonique("/api", "", "en")).toBe("https://www.data-dz.com/api");
    expect(urlCanonique("/api", "?utm_source=x", "ar")).toBe("https://www.data-dz.com/api");
  });
  it("langue imposée : la version affichée est sa propre canonique", () => {
    expect(urlCanonique("/api", "?lng=ar", "ar")).toBe("https://www.data-dz.com/api?lng=ar");
  });
});

describe("rechercheApresChangement", () => {
  it("le paramètre suit le nouveau choix et garde le reste", () => {
    expect(rechercheApresChangement("?q=eau&lng=fr", "ar")).toBe("?q=eau&lng=ar");
  });
  it("rien à changer sans paramètre ou avec la même langue", () => {
    expect(rechercheApresChangement("?q=eau", "ar")).toBeNull();
    expect(rechercheApresChangement("?lng=ar", "ar")).toBeNull();
  });
});

it("localeOpenGraph", () => {
  expect(localeOpenGraph("ar")).toBe("ar_DZ");
  expect(localeOpenGraph("xx")).toBe("fr_FR");
});
