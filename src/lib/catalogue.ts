import { supabase } from "./supabase";
import type { Categorie, Donnee, ResumeDonnee } from "./types";

/** Colonnes communes aux cartes du catalogue et à la page des favoris. */
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

/** Données publiées du catalogue, filtrées par recherche plein texte et catégorie. */
export async function chargerCatalogue({ terme, categorie }: FiltresCatalogue): Promise<ResumeDonnee[]> {
  let requete = supabase
    .from("datasets")
    .select(COLONNES_RESUME)
    .eq("statut", "publie");

  const termeNettoye = terme.trim();
  if (termeNettoye) {
    requete = requete.textSearch("recherche", termeNettoye, { config: "simple", type: "websearch" });
  }
  if (categorie) {
    requete = requete.eq("categorie_slug", categorie);
  }

  const { data, error } = await requete.order("titre->>fr");
  if (error) throw error;
  return (data ?? []) as unknown as ResumeDonnee[];
}

export async function chargerCategories(): Promise<Categorie[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("slug, nom, icone, ordre")
    .order("ordre");
  if (error) throw error;
  return (data ?? []) as Categorie[];
}

/** Chiffres réels : données publiées, catégories couvertes, total de lignes et nombre de membres inscrits. */
export async function chargerStatistiques(): Promise<StatistiquesCatalogue> {
  const [{ data, error }, membres] = await Promise.all([
    supabase.from("datasets").select("categorie_slug, versions!datasets_version_courante_fk ( nb_lignes )").eq("statut", "publie"),
    // Un profil par compte : on ne lit que le total (aucune ligne n'est téléchargée).
    supabase.from("profils").select("id", { count: "exact", head: true }),
  ]);
  if (error) throw error;
  if (membres.error) throw membres.error;

  const lignes = (data ?? []) as unknown as {
    categorie_slug: string | null;
    versions: { nb_lignes: number | null } | null;
  }[];
  const categoriesCouvertes = new Set(lignes.map((ligne) => ligne.categorie_slug).filter(Boolean));

  return {
    nbDonnees: lignes.length,
    nbCategories: categoriesCouvertes.size,
    totalLignes: lignes.reduce((total, ligne) => total + (ligne.versions?.nb_lignes ?? 0), 0),
    nbMembres: membres.count ?? 0,
  };
}

/** Fiche complète d'une donnée publiée, ou `null` si elle n'existe pas (ou n'est pas visible). */
export async function chargerFicheDonnee(slug: string): Promise<Donnee | null> {
  const { data, error } = await supabase
    .from("datasets")
    .select(
      `
      id, slug, titre, description, readme, categorie_slug, licence_code, licence_details,
      url_source, mots_cles, infos_source,
      score, nb_votes_pour, nb_votes_contre, nb_favoris, nb_commentaires,
      categories ( slug, nom, icone ),
      sources ( slug, nom, url, verifiee ),
      licences ( code, nom, url, usage_commercial, attribution_requise, partage_identique ),
      versions!datasets_version_courante_fk (
        numero, notes, nb_lignes, colonnes, apercu, publie_le,
        fichiers ( nom, format, cle_stockage, principal, taille_octets )
      )
    `
    )
    .eq("statut", "publie")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Donnee | null;
}
