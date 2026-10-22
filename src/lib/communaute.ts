import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { COLONNES_RESUME } from "./catalogue";
import { texteTraduit } from "./traduction";
import type { CompteursDonnee, ResumeDonnee } from "./types";

// Votes et favoris (tables votes et favoris — migration 20261019000005).
// Les compteurs de datasets (score, nb_votes_pour, nb_votes_contre, nb_favoris) sont recalculés par des triggers :
// le site les met à jour de façon optimiste dans le cache, sans jamais les écrire.

export type Vote = 1 | -1;

// ---------------------------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------------------------

/** Votes du membre connecté (la RLS ne lui montre que les siens) : dataset_id → +1 / -1. */
export async function chargerMesVotes(): Promise<Record<string, Vote>> {
  const { data, error } = await supabase.from("votes").select("dataset_id, valeur");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((ligne) => [ligne.dataset_id as string, ligne.valeur as Vote]));
}

/**
 * Enregistre un vote : `nouveau` null retire le vote.
 * Équivaut à un upsert, mais en deux requêtes distinctes : la base n'accorde la mise à jour que sur `valeur`,
 * alors qu'un upsert PostgREST réécrit aussi `dataset_id` (ON CONFLICT DO UPDATE SET dataset_id = …) et serait refusé.
 */
export async function enregistrerVote(datasetId: string, ancien: Vote | null, nouveau: Vote | null): Promise<void> {
  if (nouveau === null) {
    const { error } = await supabase.from("votes").delete().eq("dataset_id", datasetId);
    if (error) throw error;
    return;
  }
  if (ancien === null) {
    const { error } = await supabase.from("votes").insert({ dataset_id: datasetId, valeur: nouveau });
    // Vote déjà enregistré (autre onglet) : on le change.
    if (!error) return;
    if (error.code !== "23505") throw error;
  }
  const { error } = await supabase.from("votes").update({ valeur: nouveau }).eq("dataset_id", datasetId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------------------------
// Favoris (watchlist)
// ---------------------------------------------------------------------------------------------

/** Identifiants des données suivies par le membre connecté. */
export async function chargerMesFavoris(): Promise<string[]> {
  const { data, error } = await supabase.from("favoris").select("dataset_id");
  if (error) throw error;
  return (data ?? []).map((ligne) => ligne.dataset_id as string);
}

export interface Favori {
  cree_le: string;
  dataset: ResumeDonnee | null;
}

/** Données suivies, les plus récemment ajoutées d'abord (une donnée dépubliée n'est plus visible : dataset null). */
export async function chargerFavoris(): Promise<Favori[]> {
  const { data, error } = await supabase
    .from("favoris")
    .select(`cree_le, dataset:datasets ( ${COLONNES_RESUME} )`)
    .order("cree_le", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Favori[];
}

export async function changerFavori(datasetId: string, suivre: boolean): Promise<void> {
  const { error } = suivre
    ? await supabase.from("favoris").insert({ dataset_id: datasetId })
    : await supabase.from("favoris").delete().eq("dataset_id", datasetId);
  // Déjà en favori (autre onglet) : l'état voulu est atteint.
  if (error && !(suivre && error.code === "23505")) throw error;
}

// ---------------------------------------------------------------------------------------------
// Cache : compteurs mis à jour de façon optimiste partout où la donnée apparaît
// ---------------------------------------------------------------------------------------------

type Ajustement = (compteurs: CompteursDonnee) => Partial<CompteursDonnee>;

const ajuster = <T extends CompteursDonnee>(objet: T, datasetId: string, fn: Ajustement): T =>
  objet.id === datasetId ? { ...objet, ...fn(objet) } : objet;

/** Applique un ajustement des compteurs dans le catalogue, la fiche et les favoris ; renvoie de quoi annuler. */
export function ajusterCompteurs(clientRequetes: QueryClient, datasetId: string, fn: Ajustement): () => void {
  const sauvegardes = [
    ...clientRequetes.getQueriesData({ queryKey: ["catalogue"] }),
    ...clientRequetes.getQueriesData({ queryKey: ["fiche"] }),
    ...clientRequetes.getQueriesData({ queryKey: ["favoris"] }),
  ];
  clientRequetes.setQueriesData<ResumeDonnee[]>({ queryKey: ["catalogue"] }, (liste) =>
    liste?.map((donnee) => ajuster(donnee, datasetId, fn))
  );
  clientRequetes.setQueriesData<CompteursDonnee | null>({ queryKey: ["fiche"] }, (donnee) =>
    donnee ? ajuster(donnee, datasetId, fn) : donnee
  );
  clientRequetes.setQueriesData<Favori[]>({ queryKey: ["favoris"] }, (liste) =>
    liste?.map((favori) => (favori.dataset ? { ...favori, dataset: ajuster(favori.dataset, datasetId, fn) } : favori))
  );
  return () => sauvegardes.forEach(([cle, valeur]) => clientRequetes.setQueryData(cle, valeur));
}

/** Effet d'un changement de vote sur les compteurs. */
export const effetVote = (ancien: Vote | null, nouveau: Vote | null): Ajustement => (c) => ({
  score: c.score + (nouveau ?? 0) - (ancien ?? 0),
  nb_votes_pour: c.nb_votes_pour + Number(nouveau === 1) - Number(ancien === 1),
  nb_votes_contre: c.nb_votes_contre + Number(nouveau === -1) - Number(ancien === -1),
});

// ---------------------------------------------------------------------------------------------
// Tri du catalogue (fait dans le navigateur : le catalogue est chargé en entier)
// ---------------------------------------------------------------------------------------------

export const TRIS = ["top", "recent", "name"] as const;
export type Tri = (typeof TRIS)[number];
export const TRI_PAR_DEFAUT: Tri = "top";
export const estTri = (valeur: string | null): valeur is Tri => TRIS.includes(valeur as Tri);

export function trierDonnees(liste: ResumeDonnee[], tri: Tri, langue: string): ResumeDonnee[] {
  const collateur = new Intl.Collator(langue, { sensitivity: "base", numeric: true });
  const parNom = (a: ResumeDonnee, b: ResumeDonnee) => collateur.compare(texteTraduit(a.titre, langue), texteTraduit(b.titre, langue));
  const comparer: Record<Tri, (a: ResumeDonnee, b: ResumeDonnee) => number> = {
    // Les plus appréciés : score, puis nombre total de votes (une donnée discutée avant une donnée ignorée).
    top: (a, b) =>
      b.score - a.score ||
      b.nb_votes_pour + b.nb_votes_contre - (a.nb_votes_pour + a.nb_votes_contre) ||
      parNom(a, b),
    recent: (a, b) => Date.parse(b.mis_a_jour_le) - Date.parse(a.mis_a_jour_le) || parNom(a, b),
    name: parNom,
  };
  return [...liste].sort(comparer[tri]);
}
