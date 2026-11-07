import { supabase } from "./supabase";

/** Profil public de l'auteur d'une proposition (pseudo, nom affiché, avatar). */
export interface Proposeur {
  pseudo: string;
  nom_affiche: string | null;
  avatar_url: string | null;
}

export interface DonneeProposee {
  dataset_id: string;
  slug: string;
  publiee_le: string | null;
}

/**
 * Fonction absente : migration `20261107000018_proposeurs_donnees.sql` pas encore appliquée
 * (PGRST202 : inconnue de PostgREST ; 42883 : inconnue de Postgres). On n'affiche alors rien, sans erreur.
 */
export const fonctionAbsente = (erreur: { code?: string } | null) => erreur?.code === "PGRST202" || erreur?.code === "42883";

/** Qui a proposé cette donnée publiée (`null` si elle ne vient pas d'une proposition). */
export async function chargerProposeur(datasetId: string): Promise<Proposeur | null> {
  const { data, error } = await supabase.rpc("proposeur_donnee", { p_dataset_id: datasetId });
  if (error) {
    if (fonctionAbsente(error)) return null;
    throw error;
  }
  return ((data as Proposeur[] | null) ?? [])[0] ?? null;
}

/** Données publiées issues des propositions d'un membre, les plus récentes d'abord. */
export async function chargerDonneesProposees(pseudo: string): Promise<DonneeProposee[]> {
  const { data, error } = await supabase.rpc("donnees_proposees_par", { p_pseudo: pseudo });
  if (error) {
    if (fonctionAbsente(error)) return [];
    throw error;
  }
  return (data as DonneeProposee[] | null) ?? [];
}

/**
 * Cartes de la page d'un membre : on garde l'ordre des propositions (les plus récentes d'abord)
 * et seulement les données présentes dans le catalogue chargé.
 */
export function donneesDansLOrdre<T extends { slug: string }>(proposees: DonneeProposee[], catalogue: T[]): T[] {
  const parSlug = new Map(catalogue.map((donnee) => [donnee.slug, donnee]));
  return proposees.map((proposee) => parSlug.get(proposee.slug)).filter((donnee): donnee is T => donnee !== undefined);
}
