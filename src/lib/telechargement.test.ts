import { describe, expect, it } from "vitest";
import { fichierDemande, lienRetourTelechargement } from "./telechargement";
import { suiteSure } from "./auth";

describe("téléchargement après connexion", () => {
  it("revient sur la fiche avec le fichier choisi", () => {
    expect(lienRetourTelechargement("pharmacies", "pharmacies")).toBe("/datasets/pharmacies?download=pharmacies");
    expect(lienRetourTelechargement("tourisme", "hôtels & gîtes")).toBe("/datasets/tourisme?download=h%C3%B4tels%20%26%20g%C3%AEtes");
  });

  it("est accepté comme page de retour (chemin interne)", () => {
    const lien = lienRetourTelechargement("pharmacies", "pharmacies");
    expect(suiteSure(lien)).toBe(lien);
  });

  it("ne rouvre que les fichiers de la donnée", () => {
    expect(fichierDemande("communes", ["wilayas", "communes"])).toBe("communes");
    expect(fichierDemande("inconnu", ["wilayas"])).toBeNull();
    expect(fichierDemande(null, ["wilayas"])).toBeNull();
  });
});
