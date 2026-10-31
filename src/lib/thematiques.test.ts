import { describe, expect, it } from "vitest";
import { thematiquesDuCatalogue } from "./thematiques";
import type { Categorie, ResumeDonnee } from "./types";

const categorie = (slug: string, ordre: number) => ({ slug, nom: { fr: slug }, icone: null, ordre }) as Categorie;
const donnee = (slug: string, categorie_slug: string | null, mis_a_jour_le = "2026-01-01") =>
  ({ slug, categorie_slug, mis_a_jour_le }) as unknown as ResumeDonnee;

describe("thématiques du catalogue", () => {
  const categories = [categorie("sante", 1), categorie("education", 2), categorie("transport", 3), categorie("vide", 4)];
  const catalogue = [
    donnee("ecoles", "education", "2026-03-01"),
    donnee("universites", "education", "2026-05-01"),
    donnee("lycees", "education", "2026-04-01"),
    donnee("pharmacies", "sante"),
    donnee("gares", "transport"),
    donnee("sans-categorie", null),
  ];

  it("compte les données, masque les catégories vides, les plus fournies d'abord puis l'ordre en base", () => {
    const resultat = thematiquesDuCatalogue(categories, catalogue);
    expect(resultat.map((t) => [t.categorie.slug, t.nb])).toEqual([
      ["education", 3],
      ["sante", 1],
      ["transport", 1],
    ]);
  });

  it("garde les exemples les plus récents", () => {
    const [education] = thematiquesDuCatalogue(categories, catalogue, 2);
    expect(education.exemples.map((d) => d.slug)).toEqual(["universites", "lycees"]);
  });

  it("ne renvoie rien sans catalogue", () => {
    expect(thematiquesDuCatalogue(categories, [])).toEqual([]);
  });
});
