import { appelerApi, ErreurApi, urlTelechargement } from "./api";
import { supabase } from "./supabase";
import type { Categorie, Donnee, Fichier, Ressource, ResumeDonnee, Source, Version } from "./types";

/**
 * Colonnes Supabase d'une carte du catalogue. Le catalogue public passe par l'API ; cette liste ne sert
 * plus qu'aux requêtes propres à un membre (favoris), qui restent sur Supabase avec sa session.
 */
export const COLONNES_RESUME = `
  id, slug, titre, description, categorie_slug, licence_code, mots_cles, mis_a_jour_le,
  score, nb_votes_pour, nb_votes_contre, nb_favoris, nb_commentaires,
  sources ( slug, nom, url ),
  versions!datasets_version_courante_fk ( numero, nb_lignes, publie_le )
`;

export interface FiltresCatalogue {
  terme: string;
  categorie: string | null;
}

export interface StatistiquesCatalogue {
  nbDonnees: number;
  nbCategories: number;
  totalLignes: number;
  nbMembres: number;
}

// ---------------------------------------------------------------- Réponses de l'API

type ResumeApi = Omit<ResumeDonnee, "sources" | "versions"> & {
  source: Source | null;
  version: ResumeDonnee["versions"];
};

type FicheApi = Omit<Donnee, "sources" | "versions" | "categories" | "licences"> & {
  source: Source | null;
  categorie: Donnee["categories"];
  licence: Donnee["licences"];
  version: Omit<Version, "fichiers"> | null;
};

interface PageApi<T> {
  data: T[];
  pagination: { page: number; pages: number; total: number };
}

const versResume = ({ source, version, ...reste }: ResumeApi): ResumeDonnee => ({ ...reste, sources: source, versions: version });

/** Fichiers à plat (un par format d'origine), comme la base les décrit. */
function fichiersDe(slug: string, ressources: Ressource[]): Fichier[] {
  return ressources.flatMap((ressource) =>
    ressource.fichiers.map((fichier) => ({
      id: `${ressource.nom}.${fichier.format}`,
      nom: ressource.nom,
      format: fichier.format,
      principal: ressource.principal,
      taille_octets: fichier.taille_octets,
      url: fichier.url,
      url_telechargement: urlTelechargement(slug, ressource.nom, fichier.format),
    }))
  );
}

// ---------------------------------------------------------------- Lectures

/** Toutes les pages du catalogue publié de l'API (recherche plein texte de l'API si `q` est donné). */
async function chargerToutesLesPages(categorie: string | null, q?: string): Promise<ResumeDonnee[]> {
  const donnees: ResumeDonnee[] = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ limit: "100", page: String(page) });
    if (q) params.set("q", q);
    if (categorie) params.set("category", categorie);
    const reponse = await appelerApi<PageApi<ResumeApi>>(`/v1/datasets?${params}`);
    donnees.push(...reponse.data.map(versResume));
    if (page >= reponse.pagination.pages) return donnees;
  }
}

/**
 * Slugs trouvés par la recherche tolérante de la base (migration 20261025000010), les plus pertinents d'abord.
 * `null` en cas d'échec (migration pas encore appliquée, Supabase injoignable) : on se rabat alors sur la
 * recherche de l'API, moins tolérante mais toujours disponible.
 */
async function rechercherSlugs(terme: string): Promise<string[] | null> {
  const { data, error } = await supabase.rpc("rechercher_datasets", { terme });
  if (error) return null;
  return ((data ?? []) as { slug: string }[]).map((ligne) => ligne.slug);
}

/**
 * Données publiées du catalogue, filtrées par catégorie et par recherche (toutes les pages).
 * Avec une recherche, la liste suit l'ordre de pertinence : titres, mots-clés, catégorie et source d'abord,
 * puis tout le contenu de la fiche (description, README, colonnes, aperçu…).
 */
export async function chargerCatalogue({ terme, categorie }: FiltresCatalogue): Promise<ResumeDonnee[]> {
  const termeNettoye = terme.trim();
  if (!termeNettoye) return chargerToutesLesPages(categorie);

  const [slugs, catalogue] = await Promise.all([rechercherSlugs(termeNettoye), chargerToutesLesPages(categorie)]);
  if (!slugs) return chargerToutesLesPages(categorie, termeNettoye);
  const parSlug = new Map(catalogue.map((donnee) => [donnee.slug, donnee]));
  return slugs.flatMap((slug) => parSlug.get(slug) ?? []);
}

export async function chargerCategories(): Promise<Categorie[]> {
  return (await appelerApi<{ data: Categorie[] }>("/v1/categories")).data;
}

/** Chiffres réels : données publiées, catégories couvertes, total de lignes et nombre de membres inscrits. */
export async function chargerStatistiques(): Promise<StatistiquesCatalogue> {
  const stats = await appelerApi<{ nb_donnees: number; nb_categories: number; total_lignes: number; nb_membres: number }>("/v1/stats");
  return {
    nbDonnees: stats.nb_donnees,
    nbCategories: stats.nb_categories,
    totalLignes: stats.total_lignes,
    nbMembres: stats.nb_membres,
  };
}

/** Fiche complète d'une donnée publiée, ou `null` si elle n'existe pas (ou n'est pas visible). */
export async function chargerFicheDonnee(slug: string): Promise<Donnee | null> {
  try {
    const { source, categorie, licence, version, ...reste } = await appelerApi<FicheApi>(`/v1/datasets/${encodeURIComponent(slug)}`);
    return {
      ...reste,
      sources: source,
      categories: categorie,
      licences: licence,
      versions: version ? { ...version, fichiers: fichiersDe(slug, reste.ressources) } : null,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi && (erreur.statut === 404 || erreur.statut === 400)) return null;
    throw erreur;
  }
}
