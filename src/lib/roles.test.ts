import { describe, expect, it } from "vitest";
import { codeDepuisNom, FORMAT_CODE_ROLE, nomRole, permissionsMembre, type Role } from "./roles";
import { sourcesDesFichiers } from "./fichiers";
import type { Ressource } from "./types";

const role = (code: string, champs: Partial<Role> = {}): Role => ({
  code,
  nom: { fr: code },
  description: {},
  role_base: "membre",
  permissions: [],
  couleur: "gris",
  systeme: false,
  ordre: 100,
  ...champs,
});

describe("rôles", () => {
  it("un administrateur a toutes les permissions, les autres celles de leur rôle", () => {
    const roles = [role("gestion", { permissions: ["donnees.gerer"] })];
    expect(permissionsMembre({ role: "admin", role_code: "admin" }, roles).size).toBe(4);
    expect([...permissionsMembre({ role: "membre", role_code: "gestion" }, roles)]).toEqual(["donnees.gerer"]);
    expect(permissionsMembre({ role: "moderateur" }, roles).size).toBe(0);
    expect(permissionsMembre(null, roles).size).toBe(0);
  });

  it("tire un code valide du nom", () => {
    expect(codeDepuisNom("Équipe Santé & Hôpitaux")).toBe("equipe-sante-hopitaux");
    expect(FORMAT_CODE_ROLE.test(codeDepuisNom("Partenaire GeoAlgeria"))).toBe(true);
  });

  it("rôle système traduit par le site, rôle personnalisé avec ses propres noms", () => {
    const traduire = (cle: string) => `[${cle}]`;
    expect(nomRole(role("moderateur", { systeme: true }), "moderateur", "fr", traduire)).toBe("[admin.roles.moderateur]");
    expect(nomRole(role("partenaire", { nom: { fr: "Partenaire", ar: "شريك" } }), "partenaire", "ar", traduire)).toBe("شريك");
    expect(nomRole(role("partenaire", { nom: { fr: "Partenaire" } }), "partenaire", "en", traduire)).toBe("Partenaire");
  });
});

describe("sources des fichiers", () => {
  const ressource = (nom: string, source: string | null, principal = false): Ressource => ({
    nom,
    principal,
    source: source ? { slug: source, nom: source === "geoalgeria" ? "GeoAlgeria" : "OpenStreetMap" } : null,
    fichiers: [],
    telechargements: [],
  });

  it("la source du fichier principal d'abord, une seule entrée par source", () => {
    expect(sourcesDesFichiers([ressource("hospitals-osm", "openstreetmap"), ressource("sante", "geoalgeria", true), ressource("b", "openstreetmap")]).map((s) => s.slug)).toEqual([
      "geoalgeria",
      "openstreetmap",
    ]);
  });

  it("aucune source connue (API plus ancienne) : rien à choisir", () => {
    expect(sourcesDesFichiers([ressource("a", null)])).toEqual([]);
  });
});
