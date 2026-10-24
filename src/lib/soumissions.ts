import { supabase } from "./supabase";
import type { TexteMultilingue } from "./types";

// Propositions de données (tables soumissions, soumission_fichiers, revues — migration 20261019000005).
// Le site n'écrit que les champs de contenu : statut, revue et publication passent par les fonctions rpc.

export type TypeSoumission = "nouvelle_donnee" | "mise_a_jour";
export type StatutSoumission = "en_attente" | "modifications_demandees" | "acceptee" | "refusee" | "retiree" | "publiee";
/** « modification » : contenu ou fichiers complétés par un modérateur (le statut ne change pas). */
export type DecisionRevue = "commentaire" | "modifications_demandees" | "acceptee" | "refusee" | "modification";

export const STATUTS_SOUMISSION: StatutSoumission[] = ["en_attente", "modifications_demandees", "acceptee", "refusee", "retiree", "publiee"];
/** Tant qu'une proposition est dans un de ces statuts, son auteur peut la modifier ou la retirer. */
export const STATUTS_MODIFIABLES: StatutSoumission[] = ["en_attente", "modifications_demandees"];
export const LIMITE_SOUMISSIONS_EN_COURS = 5;

export const estModifiable = (statut: StatutSoumission) => STATUTS_MODIFIABLES.includes(statut);

/** Champs qu'un membre peut saisir (droits d'insertion et de mise à jour accordés par la base). */
export interface ChampsSoumission {
  titre: TexteMultilingue;
  description: TexteMultilingue | null;
  categorie_slug: string | null;
  licence_code: string | null;
  source_nom: string | null;
  source_url: string | null;
  mots_cles: string[];
  wilayas: string[];
  periode_debut: string | null;
  periode_fin: string | null;
  message: string | null;
}

export interface FichierSoumission {
  id: string;
  chemin_stockage: string;
  nom_original: string;
  taille_octets: number | null;
  type_mime: string | null;
  cree_le: string;
}

export interface PersonneResume {
  pseudo: string;
  nom_affiche: string | null;
  avatar_url: string | null;
}

export interface Revue {
  id: string;
  decision: DecisionRevue;
  commentaire: string | null;
  cree_le: string;
  relecteur: PersonneResume | null;
}

export interface Soumission extends ChampsSoumission {
  id: string;
  type: TypeSoumission;
  dataset_id: string | null;
  soumis_par: string;
  statut: StatutSoumission;
  revue_le: string | null;
  cree_le: string;
  mis_a_jour_le: string;
  dataset: { slug: string; titre: TexteMultilingue; statut: string } | null;
  dataset_publie: { slug: string } | null;
  auteur: PersonneResume | null;
  fichiers: FichierSoumission[];
  revues: Revue[];
}

const COLONNES_SOUMISSION = `
  id, type, dataset_id, soumis_par, titre, description, categorie_slug, licence_code, source_nom, source_url,
  mots_cles, wilayas, periode_debut, periode_fin, message, statut, revue_le, cree_le, mis_a_jour_le,
  dataset:datasets!soumissions_dataset_id_fkey ( slug, titre, statut ),
  dataset_publie:datasets!soumissions_dataset_publie_id_fkey ( slug ),
  auteur:profils!soumissions_soumis_par_fkey ( pseudo, nom_affiche, avatar_url ),
  fichiers:soumission_fichiers ( id, chemin_stockage, nom_original, taille_octets, type_mime, cree_le ),
  revues ( id, decision, commentaire, cree_le, relecteur:profils!revues_relecteur_id_fkey ( pseudo, nom_affiche, avatar_url ) )
`;

// ---------------------------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------------------------

export async function chargerMesSoumissions(idUtilisateur: string): Promise<Soumission[]> {
  const { data, error } = await supabase
    .from("soumissions")
    .select(COLONNES_SOUMISSION)
    .eq("soumis_par", idUtilisateur)
    .order("cree_le", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Soumission[];
}

/** Une proposition avec ses fichiers et l'historique des revues ; null si elle n'existe pas ou n'est pas visible. */
export async function chargerSoumission(id: string): Promise<Soumission | null> {
  const { data, error } = await supabase
    .from("soumissions")
    .select(COLONNES_SOUMISSION)
    .eq("id", id)
    .order("cree_le", { referencedTable: "revues", ascending: true })
    .order("cree_le", { referencedTable: "fichiers", ascending: true })
    .maybeSingle();
  if (error) {
    // Identifiant mal formé (pas un uuid) : même chose qu'une proposition introuvable.
    if (error.code === "22P02") return null;
    throw error;
  }
  return data as unknown as Soumission | null;
}

/** File de modération (les modérateurs voient toutes les propositions grâce à la RLS). */
export async function chargerFileModeration(statut: StatutSoumission): Promise<Soumission[]> {
  const { data, error } = await supabase
    .from("soumissions")
    .select(COLONNES_SOUMISSION)
    .eq("statut", statut)
    // Les plus anciennes d'abord : premières arrivées, premières traitées.
    .order("cree_le", { ascending: statut === "en_attente" || statut === "modifications_demandees" });
  if (error) throw error;
  return (data ?? []) as unknown as Soumission[];
}

/** Nombre de propositions par statut, pour les onglets de la file de modération. */
export async function compterParStatut(): Promise<Record<StatutSoumission, number>> {
  const comptes = await Promise.all(
    STATUTS_SOUMISSION.map(async (statut) => {
      const { count, error } = await supabase.from("soumissions").select("id", { count: "exact", head: true }).eq("statut", statut);
      if (error) throw error;
      return [statut, count ?? 0] as const;
    })
  );
  return Object.fromEntries(comptes) as Record<StatutSoumission, number>;
}

export async function compterEnAttente(): Promise<number> {
  const { count, error } = await supabase.from("soumissions").select("id", { count: "exact", head: true }).eq("statut", "en_attente");
  if (error) throw error;
  return count ?? 0;
}

export async function nbSoumissionsEnCours(): Promise<number> {
  const { data, error } = await supabase.rpc("nb_soumissions_en_cours");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function estModerateur(): Promise<boolean> {
  const { data, error } = await supabase.rpc("est_moderateur");
  if (error) throw error;
  return Boolean(data);
}

// ---------------------------------------------------------------------------------------------
// Écriture (auteur)
// ---------------------------------------------------------------------------------------------

/** Crée la proposition et renvoie son identifiant (les fichiers sont envoyés ensuite). */
export async function creerSoumission(type: TypeSoumission, datasetId: string | null, champs: ChampsSoumission): Promise<string> {
  const { data, error } = await supabase
    .from("soumissions")
    .insert({ type, dataset_id: type === "mise_a_jour" ? datasetId : null, ...champs })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function mettreAJourSoumission(id: string, champs: ChampsSoumission): Promise<void> {
  const { error } = await supabase.from("soumissions").update(champs).eq("id", id);
  if (error) throw error;
}

export async function renvoyerSoumission(id: string): Promise<void> {
  const { error } = await supabase.rpc("renvoyer_soumission", { soumission_id: id });
  if (error) throw error;
}

export async function retirerSoumission(id: string): Promise<void> {
  const { error } = await supabase.rpc("retirer_soumission", { soumission_id: id });
  if (error) throw error;
}

// ---------------------------------------------------------------------------------------------
// Fichiers (bucket privé « soumissions », chemin <uid>/<id proposition>/<nom-nettoyé>)
// ---------------------------------------------------------------------------------------------

export const TAILLE_MAX_FICHIER = 50 * 1024 * 1024;

/** Formats acceptés : extension → type MIME envoyé explicitement (le bucket refuse les autres). */
export const TYPES_FICHIER: Record<string, string> = {
  csv: "text/csv",
  json: "application/json",
  geojson: "application/geo+json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xml: "application/xml",
  zip: "application/zip",
  pdf: "application/pdf",
};

export const extensionFichier = (nom: string) => nom.split(".").pop()?.toLowerCase() ?? "";

export type ProblemeFichier = "format" | "taille" | "vide";

export function verifierFichier(fichier: File): ProblemeFichier | null {
  if (!TYPES_FICHIER[extensionFichier(fichier.name)]) return "format";
  if (fichier.size === 0) return "vide";
  if (fichier.size > TAILLE_MAX_FICHIER) return "taille";
  return null;
}

/** Clé i18n du message pour chaque problème détecté avant l'envoi. */
export const MESSAGE_PROBLEME_FICHIER: Record<ProblemeFichier, string> = {
  format: "erreurs.formatFichier",
  taille: "erreurs.fichierTropLourd",
  vide: "erreurs.fichierVide",
};

/** « Données Wilaya (2024).CSV » → « donnees-wilaya-2024.csv ». */
export function nettoyerNomFichier(nom: string): string {
  const extension = extensionFichier(nom);
  const base = nom
    .slice(0, nom.length - extension.length - 1)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "fichier"}.${extension}`;
}

/** Nom libre dans la proposition : « nom.csv », sinon « nom-2.csv », « nom-3.csv »… */
function nomDisponible(nom: string, existants: string[]): string {
  if (!existants.includes(nom)) return nom;
  const extension = extensionFichier(nom);
  const base = nom.slice(0, nom.length - extension.length - 1);
  let numero = 2;
  while (existants.includes(`${base}-${numero}.${extension}`)) numero++;
  return `${base}-${numero}.${extension}`;
}

/**
 * Envoie un fichier dans le bucket puis enregistre la ligne soumission_fichiers.
 * `idAuteur` est toujours l'auteur de la proposition, même quand un modérateur ajoute le fichier.
 * Si l'enregistrement échoue, le fichier envoyé est supprimé pour ne rien laisser d'orphelin.
 */
export async function envoyerFichierSoumission(
  idAuteur: string,
  soumissionId: string,
  fichier: File,
  nomsExistants: string[]
): Promise<FichierSoumission> {
  const contentType = TYPES_FICHIER[extensionFichier(fichier.name)];
  const nom = nomDisponible(nettoyerNomFichier(fichier.name), nomsExistants);
  const chemin = `${idAuteur}/${soumissionId}/${nom}`;

  // Contenu brut et non File : avec un File, supabase-js envoie un formulaire multipart et ignore contentType,
  // alors que le bucket n'accepte que certains types (un .geojson serait vu comme application/octet-stream).
  const { error: erreurEnvoi } = await supabase.storage
    .from("soumissions")
    .upload(chemin, await fichier.arrayBuffer(), { contentType, upsert: false });
  if (erreurEnvoi) throw erreurEnvoi;

  const { data, error } = await supabase
    .from("soumission_fichiers")
    .insert({
      soumission_id: soumissionId,
      chemin_stockage: chemin,
      nom_original: fichier.name.slice(0, 255),
      taille_octets: fichier.size,
      type_mime: contentType,
    })
    .select("id, chemin_stockage, nom_original, taille_octets, type_mime, cree_le")
    .single();
  if (error) {
    await supabase.storage.from("soumissions").remove([chemin]);
    throw error;
  }
  return data as FichierSoumission;
}

export async function supprimerFichierSoumission(fichier: FichierSoumission): Promise<void> {
  const { error: erreurStockage } = await supabase.storage.from("soumissions").remove([fichier.chemin_stockage]);
  if (erreurStockage) throw erreurStockage;
  const { error } = await supabase.from("soumission_fichiers").delete().eq("id", fichier.id);
  if (error) throw error;
}

/** Nom affiché d'un fichier stocké (dernier segment du chemin). */
export const nomStocke = (chemin: string) => chemin.split("/").pop() ?? chemin;

/** Lien temporaire (bucket privé) pour télécharger ou prévisualiser un fichier proposé. */
export async function urlSigneeFichier(chemin: string, telechargement = false): Promise<string> {
  const { data, error } = await supabase.storage
    .from("soumissions")
    .createSignedUrl(chemin, 10 * 60, telechargement ? { download: nomStocke(chemin) } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------------------------
// Modération
// ---------------------------------------------------------------------------------------------

export async function deciderSoumission(id: string, decision: DecisionRevue, commentaire: string | null): Promise<StatutSoumission> {
  const { data, error } = await supabase.rpc("decider_soumission", {
    soumission_id: id,
    decision,
    commentaire: commentaire?.trim() || null,
  });
  if (error) throw error;
  return data as StatutSoumission;
}

/** Trace dans l'historique une modification faite par un modérateur (l'auteur est notifié par la base). */
export async function noterModification(id: string, details: string): Promise<void> {
  const { error } = await supabase.rpc("noter_modification", { soumission_id: id, details: details.trim().slice(0, 2000) });
  if (error) throw error;
}

/**
 * Télécharge un fichier du bucket privé via un lien signé valable 10 minutes.
 * Le lien impose « Content-Disposition: attachment » : la page courante reste affichée.
 */
export async function telechargerFichierPrive(chemin: string): Promise<void> {
  window.location.assign(await urlSigneeFichier(chemin, true));
}

/**
 * Ouvre un fichier du bucket privé dans un nouvel onglet (PDF…). L'onglet est ouvert tout de suite,
 * avant d'attendre le lien signé, pour ne pas être pris pour une fenêtre surgissante.
 */
export async function ouvrirFichierPrive(chemin: string): Promise<void> {
  const onglet = window.open("about:blank", "_blank");
  try {
    const url = await urlSigneeFichier(chemin);
    if (onglet) {
      onglet.opener = null;
      onglet.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (e) {
    onglet?.close();
    throw e;
  }
}
