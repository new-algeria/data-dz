import { supabase } from "./supabase";
import type { TexteMultilingue } from "./types";

export type StatutDataset = "brouillon" | "en_revue" | "publie" | "archive";
/** Statuts proposés dans l'espace modération (en_revue reste affiché s'il existe). */
export const STATUTS_DATASET_MODIFIABLES: StatutDataset[] = ["publie", "brouillon", "archive"];

export interface DatasetModeration {
  id: string;
  slug: string;
  titre: TexteMultilingue;
  statut: StatutDataset;
  categorie_slug: string | null;
  mis_a_jour_le: string;
  sources: { nom: string } | null;
  versions: { numero: string; nb_lignes: number | null } | null;
}

/** Tous les datasets, brouillons compris : la RLS ne les montre qu'aux modérateurs. */
export async function chargerDatasetsModeration(): Promise<DatasetModeration[]> {
  const { data, error } = await supabase
    .from("datasets")
    .select("id, slug, titre, statut, categorie_slug, mis_a_jour_le, sources ( nom ), versions!datasets_version_courante_fk ( numero, nb_lignes )")
    .order("mis_a_jour_le", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DatasetModeration[];
}

export async function changerStatutDataset(id: string, statut: StatutDataset): Promise<void> {
  const { error } = await supabase.from("datasets").update({ statut }).eq("id", id);
  if (error) throw error;
}
