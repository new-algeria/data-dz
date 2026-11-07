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

// ---------------------------------------------------------------- Tags OpenStreetMap (flux et inventaire)
// Tables `osm_flux` et `osm_tags` (migration 20261107000019), via `/v1/admin/sync/openstreetmap/*`.
// Clés React Query : ["admin", "osm", "flux"], ["admin", "osm", "tags"].

export interface FluxOsm {
  code: string;
  dataset_slug: string;
  fichier: string;
  filtres: string[];
  exige: Record<string, string[]>;
  rayon_m: number | null;
  actif: boolean;
  ordre: number;
  dernier_compte: number | null;
  dernier_compte_le: string | null;
}

export type EtatTag = "nouveau" | "a_etudier" | "ecarte";

export interface TagOsm {
  cle: string;
  valeur: string;
  nb: number;
  nb_precedent: number | null;
  etat: EtatTag;
  premier_vu: string;
  dernier_vu: string;
  /** Code du flux qui extrait déjà ce tag. */
  flux: string | null;
}

export interface NouveauFlux {
  dataset_slug: string;
  fichier: string;
  cle: string;
  valeurs: string[];
  rayon_m?: number | null;
}

const json = (corps: unknown) => ({ body: JSON.stringify(corps), headers: { "Content-Type": "application/json" } });
const BASE_OSM = "/v1/admin/sync/openstreetmap";

export const chargerFluxOsm = async () => (await appelerApi<{ data: FluxOsm[] }>(`${BASE_OSM}/flux`, { authentifie: true })).data;
export const enregistrerFluxOsm = (code: string, champs: NouveauFlux) =>
  appelerApi<FluxOsm>(`${BASE_OSM}/flux/${encodeURIComponent(code)}`, { method: "PUT", authentifie: true, ...json(champs) });
export const modifierFluxOsm = (code: string, champs: { actif?: boolean }) =>
  appelerApi<FluxOsm>(`${BASE_OSM}/flux/${encodeURIComponent(code)}`, { method: "PATCH", authentifie: true, ...json(champs) });
export const supprimerFluxOsm = (code: string) => appelerApi<null>(`${BASE_OSM}/flux/${encodeURIComponent(code)}`, { method: "DELETE", authentifie: true });
export const chargerTagsOsm = () => appelerApi<{ data: TagOsm[]; inventaire_du: string | null }>(`${BASE_OSM}/tags`, { authentifie: true });
export const classerTagOsm = (cle: string, valeur: string, etat: EtatTag) =>
  appelerApi<null>(`${BASE_OSM}/tags`, { method: "PATCH", authentifie: true, ...json({ cle, valeur, etat }) });
export const compterTagOsm = (cle: string, valeurs: string[]) =>
  appelerApi<{ nb: number; source: "inventaire" | "overpass"; date: string | null }>(
    `${BASE_OSM}/count?${new URLSearchParams({ cle, valeurs: valeurs.join(",") })}`,
    { authentifie: true }
  );

export const FORMAT_CLE_OSM = /^[a-z][a-z0-9_:]{0,59}$/;
export const FORMAT_VALEUR_OSM = /^[A-Za-z0-9_:.+-]+(?: [A-Za-z0-9_:.+-]+)*$/;

/** « amenity=cafe,restaurant » → clé et valeurs, ou null si invalide (même format que l'API). */
export function lireTagSaisi(texte: string): { cle: string; valeurs: string[] } | null {
  const [cle, reste, ...trop] = texte.trim().split("=");
  if (trop.length || !cle || !reste || !FORMAT_CLE_OSM.test(cle.trim())) return null;
  const valeurs = [...new Set(reste.split(",").map((valeur) => valeur.trim()).filter(Boolean))];
  if (valeurs.length === 0 || valeurs.length > 20 || !valeurs.every((valeur) => FORMAT_VALEUR_OSM.test(valeur) && valeur.length <= 80)) return null;
  return { cle: cle.trim(), valeurs };
}

/** Code et nom de fichier proposés pour un nouveau flux (« amenity=cafe » → « cafe », « cafe-osm »). */
export function nomsProposes(valeurs: string[], complement: boolean) {
  const base = valeurs[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "flux";
  return { code: base.length >= 2 ? base : `${base}-osm`, fichier: complement ? `${base}-osm` : base.replace(/-/g, "_") };
}

/** « nwr/tourism=hotel,motel » → « tourism=hotel,motel ». */
export const tagLisible = (filtre: string) => filtre.replace(/^[nwr]+\//, "");
