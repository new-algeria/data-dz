import { afterEach, describe, expect, it, vi } from "vitest";
import { fichierDemande, lienRetourTelechargement, lienTelechargementSite } from "./telechargement";
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

describe("lien de téléchargement du site", () => {
  afterEach(() => vi.unstubAllGlobals());
  const reponse = (statut: number, corps: unknown) =>
    ({ status: statut, ok: statut < 400, type: "basic", json: async () => corps }) as unknown as Response;

  it("demande le lien signé à l'API, en POST, avec le fichier et le format", async () => {
    const fetch = vi.fn(async () => reponse(200, { url: "https://r2.exemple/f.csv?sig=1" }));
    vi.stubGlobal("fetch", fetch);
    await expect(lienTelechargementSite("pharmacies", "pharmacies", "csv")).resolves.toBe("https://r2.exemple/f.csv?sig=1");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1/datasets/pharmacies/download-link?format=csv&file=pharmacies");
    expect(init.method).toBe("POST");
  });

  it("revient à l'ancien lien tant que l'API n'a pas la route", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(reponse(404, { code: "not_found" }))
      .mockResolvedValueOnce({ status: 0, type: "opaqueredirect", ok: false } as unknown as Response);
    vi.stubGlobal("fetch", fetch);
    await expect(lienTelechargementSite("pharmacies", "pharmacies", "xlsx")).resolves.toContain("/v1/datasets/pharmacies/download?format=xlsx&file=pharmacies");
  });

  it("garde l'erreur d'une conversion impossible", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse(422, { code: "not_convertible", title: "Pas de coordonnées" })));
    await expect(lienTelechargementSite("x", "x", "geojson")).rejects.toMatchObject({ statut: 422 });
  });
});
