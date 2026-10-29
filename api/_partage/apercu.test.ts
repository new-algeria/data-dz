import { describe, expect, it } from "vitest";
import { descriptionPartage, elementImage, htmlPartage, libelleLignes, resumerFiche, type FicheApi } from "./apercu";

const pharmacies: FicheApi = {
  slug: "pharmacies",
  titre: { fr: "Pharmacies d'Algérie", en: "Algeria pharmacies (officines)", ar: "صيدليات الجزائر" },
  description: { en: "Algeria's pharmacies from OpenStreetMap: geocoded, bilingual FR/AR." },
  categorie: { nom: { fr: "Santé", en: "Health" } },
  source: { nom: "GeoAlgeria" },
  version: { nb_lignes: 3807 },
  ressources: [{ telechargements: [{ format: "geojson" }, { format: "csv" }, { format: "xlsx" }, { format: "json" }] }],
};

describe("aperçu de partage", () => {
  it("résume la fiche en anglais avec les chiffres clés", () => {
    const resume = resumerFiche(pharmacies);
    expect(resume).toMatchObject({ titre: "Algeria pharmacies (officines)", categorie: "Health", source: "GeoAlgeria", nbLignes: 3807, formats: ["CSV", "Excel", "JSON", "GeoJSON"] });
    expect(libelleLignes(3807)).toBe("3,807 rows");
    expect(descriptionPartage(resume)).toBe("3,807 rows · CSV, Excel, JSON, GeoJSON · Source: GeoAlgeria — Algeria's pharmacies from OpenStreetMap: geocoded, bilingual FR/AR.");
  });

  it("reprend le titre français sans traduction anglaise", () => {
    expect(resumerFiche({ ...pharmacies, titre: { fr: "Pharmacies d'Algérie" } }).titre).toBe("Pharmacies d'Algérie");
  });

  it("écrit les balises Open Graph et Twitter, texte échappé", () => {
    const html = htmlPartage(resumerFiche({ ...pharmacies, titre: { en: 'Data <script>"x"' } }), "/datasets/pharmacies", "https://www.data-dz.com/api/og?slug=pharmacies");
    expect(html).toContain('<meta property="og:title" content="Data &lt;script&gt;&quot;x&quot; · data-dz">');
    expect(html).toContain('<meta property="og:image" content="https://www.data-dz.com/api/og?slug=pharmacies">');
    expect(html).toContain('<meta property="og:url" content="https://www.data-dz.com/datasets/pharmacies">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).not.toContain("<script>");
  });

  it("garde un aperçu général quand la donnée est introuvable", () => {
    expect(htmlPartage(null, "/", "https://www.data-dz.com/api/og")).toContain("data-dz · Open data on Algeria");
    expect(JSON.stringify(elementImage(null, "logo.png"))).toContain("Open data on Algeria");
  });
});
