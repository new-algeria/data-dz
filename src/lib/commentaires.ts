import { supabase } from "./supabase";
import type { PersonneResume } from "./soumissions";

// Commentaires d'une fiche (table commentaires — migration 20261019000005).
// Un seul niveau de réponses ; la base vérifie les règles (même donnée, anti-spam) et vide le contenu d'un commentaire supprimé.

export const LONGUEUR_MAX_COMMENTAIRE = 2000;

export interface Commentaire {
  id: string;
  dataset_id: string;
  auteur_id: string | null;
  parent_id: string | null;
  contenu: string;
  supprime: boolean;
  masque: boolean;
  cree_le: string;
  modifie_le: string | null;
  auteur: PersonneResume | null;
}

const COLONNES = `
  id, dataset_id, auteur_id, parent_id, contenu, supprime, masque, cree_le, modifie_le,
  auteur:profils!commentaires_auteur_id_fkey ( pseudo, nom_affiche, avatar_url )
`;

/** Commentaires visibles (la RLS montre en plus les commentaires masqués aux modérateurs et à leur auteur). */
export async function chargerCommentaires(datasetId: string): Promise<Commentaire[]> {
  const { data, error } = await supabase
    .from("commentaires")
    .select(COLONNES)
    .eq("dataset_id", datasetId)
    .order("cree_le", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Commentaire[];
}

export async function publierCommentaire(datasetId: string, contenu: string, parentId: string | null): Promise<Commentaire> {
  const { data, error } = await supabase
    .from("commentaires")
    .insert({ dataset_id: datasetId, parent_id: parentId, contenu: contenu.trim() })
    .select(COLONNES)
    .single();
  if (error) throw error;
  return data as unknown as Commentaire;
}

export async function modifierCommentaire(id: string, contenu: string): Promise<void> {
  const { error } = await supabase.from("commentaires").update({ contenu: contenu.trim() }).eq("id", id);
  if (error) throw error;
}

/** Suppression par l'auteur : la ligne reste (pour garder les réponses), son contenu est vidé par la base. */
export async function supprimerCommentaire(id: string): Promise<void> {
  const { error } = await supabase.from("commentaires").update({ supprime: true }).eq("id", id);
  if (error) throw error;
}

export async function masquerCommentaire(id: string, masquer: boolean): Promise<void> {
  const { error } = await supabase.rpc("masquer_commentaire", { commentaire_id: id, masquer });
  if (error) throw error;
}

export interface FilCommentaire {
  /** null : commentaire d'origine invisible (masqué) dont des réponses restent visibles. */
  commentaire: Commentaire | null;
  reponses: Commentaire[];
}

/**
 * Fils de discussion dans l'ordre chronologique. Un commentaire supprimé n'apparaît que s'il a des réponses
 * (« Commentaire supprimé ») ; une réponse supprimée disparaît.
 */
export function construireFils(commentaires: Commentaire[]): FilCommentaire[] {
  const principaux = commentaires.filter((c) => c.parent_id === null);
  const idsPrincipaux = new Set(principaux.map((c) => c.id));
  const reponsesDe = (id: string) => commentaires.filter((c) => c.parent_id === id && !c.supprime);

  const fils: (FilCommentaire & { date: string })[] = principaux
    .map((commentaire) => ({ commentaire, reponses: reponsesDe(commentaire.id), date: commentaire.cree_le }))
    .filter((fil) => !fil.commentaire.supprime || fil.reponses.length > 0);

  // Réponses dont le commentaire d'origine n'est pas visible (masqué par un modérateur).
  const orphelins = new Set(commentaires.filter((c) => c.parent_id && !idsPrincipaux.has(c.parent_id)).map((c) => c.parent_id as string));
  for (const parentId of orphelins) {
    const reponses = reponsesDe(parentId);
    if (reponses.length) fils.push({ commentaire: null, reponses, date: reponses[0].cree_le });
  }
  return fils.sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).map(({ commentaire, reponses }) => ({ commentaire, reponses }));
}

/** Nombre de commentaires lisibles (ni supprimés, ni masqués). */
export const compterVisibles = (commentaires: Commentaire[]) => commentaires.filter((c) => !c.supprime && !c.masque).length;
