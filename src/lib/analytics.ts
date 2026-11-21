import { supabase } from "./supabase";
import { fonctionAbsente } from "./contributions";

/** Périodes proposées sur la page /admin/analytics. */
export const PERIODES = ["7j", "30j", "90j", "12m", "tout"] as const;
export type Periode = (typeof PERIODES)[number];
export type Pas = "day" | "week" | "month";

export interface Intervalle {
  debut: Date;
  fin: Date;
  pas: Pas;
}

const JOUR = 86_400_000;

/** Premier jour d'enregistrement des statistiques datées (migration 20261120000032), heure d'Alger. */
export const DEBUT_STATISTIQUES = new Date("2026-11-20T00:00:00+01:00");

/** Pas lisible selon la durée : jour jusqu'à 2 mois, semaine jusqu'à 1 an, mois au-delà. */
export function pasPourDuree(debut: Date, fin: Date): Pas {
  const jours = (fin.getTime() - debut.getTime()) / JOUR;
  return jours <= 62 ? "day" : jours <= 366 ? "week" : "month";
}

/** Bornes et pas d'agrégation d'une période se terminant maintenant (fin exclue). */
export function intervallePeriode(periode: Periode, maintenant = new Date()): Intervalle {
  const fin = new Date(maintenant.getTime());
  switch (periode) {
    case "7j":
      return { debut: new Date(fin.getTime() - 7 * JOUR), fin, pas: "day" };
    case "30j":
      return { debut: new Date(fin.getTime() - 30 * JOUR), fin, pas: "day" };
    case "90j":
      return { debut: new Date(fin.getTime() - 90 * JOUR), fin, pas: "week" };
    case "12m": {
      const debut = new Date(fin.getTime());
      debut.setUTCFullYear(debut.getUTCFullYear() - 1);
      return { debut, fin, pas: "month" };
    }
    case "tout": {
      const debut = DEBUT_STATISTIQUES.getTime() < fin.getTime() ? DEBUT_STATISTIQUES : new Date(fin.getTime() - JOUR);
      return { debut, fin, pas: pasPourDuree(debut, fin) };
    }
  }
}

export const estPeriode = (valeur: string | null): valeur is Periode => PERIODES.includes(valeur as Periode);

export interface PointSerie {
  periode: string;
  vues: number;
  telechargements: number;
}

export interface DonneeTop {
  slug: string;
  titre: Record<string, string> | null;
  vues: number;
  telechargements: number;
}

export interface Repartition {
  dimension: "format" | "origine";
  valeur: string;
  nombre: number;
}

export interface CompteTelechargements {
  utilisateur_id: string;
  pseudo: string | null;
  nom_affiche: string | null;
  avatar_url: string | null;
  telechargements: number;
  donnees: number;
  dernier: string;
}

export interface TelechargementCompte {
  cree_le: string;
  slug: string;
  titre: Record<string, string> | null;
  fichier: string | null;
  format: string | null;
}

/** Migration `20261120000032_evenements_donnees.sql` pas encore appliquée. */
export class MigrationAnalyticsAbsente extends Error {
  constructor() {
    super("migration_analytics_absente");
  }
}

/** Les compteurs Postgres (bigint) arrivent parfois en chaîne : on les ramène en nombres. */
export const enNombre = (valeur: unknown) => (typeof valeur === "number" ? valeur : Number(valeur ?? 0) || 0);

async function appelerRpc<T>(nom: string, parametres: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(nom, parametres);
  if (error) {
    if (fonctionAbsente(error)) throw new MigrationAnalyticsAbsente();
    throw error;
  }
  return (data as T[] | null) ?? [];
}

const bornes = ({ debut, fin }: Intervalle) => ({ p_debut: debut.toISOString(), p_fin: fin.toISOString() });

export async function chargerSerie(intervalle: Intervalle): Promise<PointSerie[]> {
  const lignes = await appelerRpc<PointSerie>("analytics_series", { ...bornes(intervalle), p_pas: intervalle.pas });
  return lignes.map((l) => ({ periode: l.periode, vues: enNombre(l.vues), telechargements: enNombre(l.telechargements) }));
}

export async function chargerTopDonnees(intervalle: Intervalle, limite = 10): Promise<DonneeTop[]> {
  const lignes = await appelerRpc<DonneeTop>("analytics_top_donnees", { ...bornes(intervalle), p_limite: limite });
  return lignes.map((l) => ({ ...l, vues: enNombre(l.vues), telechargements: enNombre(l.telechargements) }));
}

export async function chargerRepartition(intervalle: Intervalle): Promise<Repartition[]> {
  const lignes = await appelerRpc<Repartition>("analytics_repartition", bornes(intervalle));
  return lignes.map((l) => ({ ...l, nombre: enNombre(l.nombre) }));
}

export async function chargerComptes(intervalle: Intervalle, limite = 50): Promise<CompteTelechargements[]> {
  const lignes = await appelerRpc<CompteTelechargements>("analytics_comptes", { ...bornes(intervalle), p_limite: limite });
  return lignes.map((l) => ({ ...l, telechargements: enNombre(l.telechargements), donnees: enNombre(l.donnees) }));
}

export async function chargerTelechargementsCompte(utilisateurId: string, intervalle: Intervalle): Promise<TelechargementCompte[]> {
  return appelerRpc<TelechargementCompte>("analytics_compte", { p_utilisateur: utilisateurId, ...bornes(intervalle) });
}

/** Totaux de la période, calculés sur la série. */
export function totauxSerie(serie: PointSerie[]) {
  return serie.reduce((t, p) => ({ vues: t.vues + p.vues, telechargements: t.telechargements + p.telechargements }), { vues: 0, telechargements: 0 });
}

/** Libellé court d'un point de la série selon le pas (jour « 20 nov. », mois « nov. 2026 »). */
export function libellePeriode(iso: string, pas: Pas, locale: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions =
    pas === "month" ? { month: "short", year: "numeric", timeZone: "Africa/Algiers" } : { day: "numeric", month: "short", timeZone: "Africa/Algiers" };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Part en pourcentage, arrondie (0 si le total est nul). */
export const part = (nombre: number, total: number) => (total > 0 ? Math.round((nombre / total) * 100) : 0);

/** Compteurs cumulés d'une donnée du catalogue (avant et depuis les statistiques datées). */
export interface DonneeCumul {
  slug: string;
  titre: Record<string, string> | null;
  nb_vues?: number;
  nb_telechargements?: number;
}

/** Totaux cumulés du catalogue et données les plus téléchargées (puis les plus vues), sans les données à zéro. */
export function cumulsCatalogue(donnees: DonneeCumul[], limite = 10) {
  const lignes = donnees.map((d) => ({ slug: d.slug, titre: d.titre, vues: enNombre(d.nb_vues), telechargements: enNombre(d.nb_telechargements) }));
  const totaux = lignes.reduce((t, l) => ({ vues: t.vues + l.vues, telechargements: t.telechargements + l.telechargements }), { vues: 0, telechargements: 0 });
  const top = lignes
    .filter((l) => l.vues > 0 || l.telechargements > 0)
    .sort((x, y) => y.telechargements - x.telechargements || y.vues - x.vues || x.slug.localeCompare(y.slug))
    .slice(0, limite);
  return { totaux, top };
}
