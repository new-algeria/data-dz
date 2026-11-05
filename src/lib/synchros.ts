import { appelerApi } from "./api";
import type { TexteMultilingue } from "./types";

/**
 * Synchronisations (OpenStreetMap, GeoAlgeria…) : tout passe par l'API (`/v1/admin/sync`, permission `synchro.gerer`).
 * Mode « interne » : GitHub Action du dépôt de l'API, pilotée d'ici (active, intervalle, forcer).
 * Mode « externe » : script d'un partenaire, seulement suivi. Clé React Query : ["admin", "synchros"].
 */

export type StatutExecution = "reussie" | "partielle" | "echec" | "essai";

export interface RapportFichierSynchro {
  extraits?: number;
  total?: number;
  ajoutes?: number;
  mis_a_jour?: number;
  absents?: number;
  nouveaux_absents?: number;
  geoalgeria?: number;
  change?: boolean;
}

export interface RapportDonneeSynchro {
  creee?: boolean;
  complement?: boolean;
  publiee?: boolean;
  version?: string;
  anomalie?: string;
  erreur?: string;
  fichiers?: Record<string, RapportFichierSynchro>;
}

export interface RapportSynchro {
  extrait_du?: string | null;
  donnees?: Record<string, RapportDonneeSynchro>;
}

export interface ExecutionSynchro {
  id: string;
  debut: string;
  fin: string | null;
  statut: StatutExecution;
  declencheur: "planifie" | "manuel" | "forcer";
  resume: string | null;
  rapport: RapportSynchro;
}

export interface Synchro {
  code: string;
  nom: string;
  mode: "interne" | "externe";
  actif: boolean;
  intervalle_jours: number;
  forcer: boolean;
  derniere_execution: string | null;
  dernier_statut: StatutExecution | null;
  dernier_rapport: RapportSynchro | null;
  description: string | null;
  sources: { slug: string; nom: string } | null;
  prochaine_execution: string | null;
  a_faire: boolean;
  executions: ExecutionSynchro[];
  dernieres_versions: { slug: string; titre: TexteMultilingue; version: { numero: string; publie_le: string | null } | null }[];
}

export const chargerSynchros = async () => (await appelerApi<{ data: Synchro[] }>("/v1/admin/sync", { authentifie: true })).data;

export const modifierSynchro = (code: string, champs: Partial<Pick<Synchro, "actif" | "intervalle_jours" | "forcer">>) =>
  appelerApi<Synchro>(`/v1/admin/sync/${code}`, {
    method: "PATCH",
    authentifie: true,
    body: JSON.stringify(champs),
    headers: { "Content-Type": "application/json" },
  });

/** Totaux d'un rapport, pour le résumé d'une exécution. */
export function totauxRapport(rapport: RapportSynchro | null | undefined) {
  const donnees = Object.values(rapport?.donnees ?? {});
  const fichiers = donnees.flatMap((donnee) => Object.values(donnee.fichiers ?? {}));
  return {
    donnees: donnees.length,
    publiees: donnees.filter((donnee) => donnee.publiee).length,
    problemes: donnees.filter((donnee) => donnee.erreur || donnee.anomalie).length,
    objets: fichiers.reduce((total, fichier) => total + (fichier.total ?? 0), 0),
    ajoutes: fichiers.reduce((total, fichier) => total + (fichier.ajoutes ?? 0), 0),
    absents: fichiers.reduce((total, fichier) => total + (fichier.absents ?? 0), 0),
  };
}
