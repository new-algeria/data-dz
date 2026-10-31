import type { Categorie, ResumeDonnee } from "./types";

export interface Thematique {
  categorie: Categorie;
  /** Nombre de données publiées dans la catégorie. */
  nb: number;
  /** Quelques données de la catégorie (les plus récentes d'abord), pour la page des thématiques. */
  exemples: ResumeDonnee[];
}

const dateDe = (donnee: ResumeDonnee) => donnee.mis_a_jour_le ?? "";

/**
 * Thématiques à afficher : catégories ayant au moins une donnée, les plus fournies d'abord
 * (à égalité, l'ordre choisi en base). Rien n'est écrit en dur : tout vient du catalogue chargé.
 */
export function thematiquesDuCatalogue(categories: Categorie[], catalogue: ResumeDonnee[], nbExemples = 3): Thematique[] {
  const parCategorie = new Map<string, ResumeDonnee[]>();
  for (const donnee of catalogue) {
    if (!donnee.categorie_slug) continue;
    const liste = parCategorie.get(donnee.categorie_slug) ?? [];
    liste.push(donnee);
    parCategorie.set(donnee.categorie_slug, liste);
  }
  return categories
    .map((categorie) => {
      const donnees = parCategorie.get(categorie.slug) ?? [];
      const exemples = [...donnees].sort((a, b) => dateDe(b).localeCompare(dateDe(a))).slice(0, nbExemples);
      return { categorie, nb: donnees.length, exemples };
    })
    .filter((thematique) => thematique.nb > 0)
    .sort((a, b) => b.nb - a.nb || a.categorie.ordre - b.categorie.ordre);
}
