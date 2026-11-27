import { describe, expect, it } from "vitest";
import { cleBienvenue, estNouveauCompte, estPageAuthentification, modeBienvenue, prenomBienvenue } from "./bienvenue";

const JOUR = 24 * 60 * 60 * 1000;
const maintenant = Date.parse("2026-11-27T12:00:00Z");

describe("estNouveauCompte", () => {
  it("compte de moins de 7 jours", () => {
    expect(estNouveauCompte({ created_at: new Date(maintenant - JOUR).toISOString() }, maintenant)).toBe(true);
    expect(estNouveauCompte({ created_at: new Date(maintenant - 8 * JOUR).toISOString() }, maintenant)).toBe(false);
  });
  it("date absente ou illisible", () => {
    expect(estNouveauCompte({ created_at: "" }, maintenant)).toBe(false);
  });
});

describe("modeBienvenue", () => {
  it("rien sur les pages de connexion", () => {
    expect(modeBienvenue("/auth/callback", "?code=x")).toBeNull();
    expect(modeBienvenue("/login", "")).toBeNull();
    expect(estPageAuthentification("/signup/")).toBe(true);
  });
  it("simple message s'il revient pour télécharger", () => {
    expect(modeBienvenue("/datasets/pharmacies", "?download=pharmacies")).toBe("message-telechargement");
  });
  it("simple message sur DjazAI et pour proposer une donnée", () => {
    expect(modeBienvenue("/djazai", "")).toBe("message");
    expect(modeBienvenue("/submit", "")).toBe("message");
  });
  it("grande fenêtre ailleurs", () => {
    expect(modeBienvenue("/", "")).toBe("fenetre");
    expect(modeBienvenue("/datasets/pharmacies", "?lng=fr")).toBe("fenetre");
    expect(modeBienvenue("/djazaix", "")).toBe("fenetre");
  });
});

describe("prenomBienvenue", () => {
  it("premier mot du nom affiché, puis du nom Google, puis le pseudo", () => {
    expect(prenomBienvenue({ nom_affiche: "Yacine Benali", pseudo: "yacine16" }, null)).toBe("Yacine");
    expect(prenomBienvenue({ nom_affiche: null, pseudo: "yacine16" }, { user_metadata: { full_name: "Amina Kaci" } })).toBe("Amina");
    expect(prenomBienvenue({ nom_affiche: " ", pseudo: "yacine16" }, { user_metadata: {} })).toBe("yacine16");
    expect(prenomBienvenue(null, null)).toBeNull();
  });
});

it("cleBienvenue", () => {
  expect(cleBienvenue("abc")).toBe("data-dz:bienvenue:v1:abc");
});
