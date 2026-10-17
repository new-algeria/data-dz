import { supabase } from "./supabase";
import type { Categorie, Donnee, ResumeDonnee } from "./types";

export interface FiltresCatalogue {
  terme: string;
  categorie: string | null;
}

export interface StatistiquesCatalogue {
  nbDonnees: number;
  nbCategories: number;
  totalLignes: number;
}

/** Données publiées du catalogue, filtrées par recherche plein texte et catégorie. */
export async function chargerCatalogue({ terme, categorie }: FiltresCatalogue): Promise<ResumeDonnee[]> {
  let requete = supabase
    .from("datasets")
    .select(
      `
      slug, titre, description, categorie_slug, licence_code, mots_cles,
      sources ( slug, nom, url ),
      versions!datasets_version_courante_fk ( numero, nb_lignes, publie_le )
    `
    )
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

/** Chiffres réels du catalogue : nombre de données publiées, de catégories couvertes et total de lignes. */
export async function chargerStatistiques(): Promise<StatistiquesCatalogue> {
  const { data, error } = await supabase
    .from("datasets")
    .select("categorie_slug, versions!datasets_version_courante_fk ( nb_lignes )")
    .eq("statut", "publie");
  if (error) throw error;

  const lignes = (data ?? []) as unknown as {
    categorie_slug: string | null;
    versions: { nb_lignes: number | null } | null;
  }[];
  const categoriesCouvertes = new Set(lignes.map((ligne) => ligne.categorie_slug).filter(Boolean));

  return {
    nbDonnees: lignes.length,
    nbCategories: categoriesCouvertes.size,
    totalLignes: lignes.reduce((total, ligne) => total + (ligne.versions?.nb_lignes ?? 0), 0),
  };
}

/** Fiche complète d'une donnée publiée, ou `null` si elle n'existe pas (ou n'est pas visible). */
export async function chargerFicheDonnee(slug: string): Promise<Donnee | null> {
  const { data, error } = await supabase
    .from("datasets")
    .select(
      `
      slug, titre, description, readme, categorie_slug, licence_code, licence_details,
      url_source, mots_cles, infos_source,
      categories ( slug, nom ),
      sources ( slug, nom, url ),
      licences ( code, nom, url ),
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
