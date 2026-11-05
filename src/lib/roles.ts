import { supabase } from "./supabase";
import type { Profil, RoleUtilisateur } from "./profils";
import type { TexteMultilingue } from "./types";

// Rôles personnalisés (migration 20261102000016_roles_personnalises.sql). Table `roles` lisible par tous ;
// création, modification et suppression par rpc, réservées aux administrateurs et vérifiées par la base.
// Clé React Query : ["roles"].

/** Droits qu'un rôle peut porter en plus de son niveau de base. Même liste que la contrainte de la base et l'API. */
export const PERMISSIONS = ["donnees.gerer", "membres.gerer", "synchro.gerer", "djazai.illimite"] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Niveaux de base proposés pour un rôle personnalisé (« admin » reste réservé au rôle système). */
export const NIVEAUX_BASE: RoleUtilisateur[] = ["membre", "contributeur", "moderateur"];

export const COULEURS_ROLE = ["gris", "bleu", "vert", "ambre", "rouge", "violet", "rose"] as const;
export type CouleurRole = (typeof COULEURS_ROLE)[number];

/** Classes du badge de chaque couleur (fond + texte, clair et sombre). */
export const CLASSES_COULEUR: Record<CouleurRole, string> = {
  gris: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  bleu: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  vert: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  ambre: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  rouge: "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
  rose: "bg-pink-100 text-pink-800 dark:bg-pink-400/15 dark:text-pink-300",
};

export interface Role {
  code: string;
  nom: TexteMultilingue & { fr: string };
  description: TexteMultilingue;
  role_base: RoleUtilisateur;
  permissions: Permission[];
  couleur: CouleurRole;
  systeme: boolean;
  ordre: number;
}

export interface ChampsRole {
  code: string;
  nom: TexteMultilingue & { fr: string };
  description: TexteMultilingue;
  role_base: RoleUtilisateur;
  permissions: Permission[];
  couleur: CouleurRole;
}

/**
 * Les 4 rôles système, utilisés tant que la migration n'est pas appliquée (table absente) :
 * le site garde alors exactement le comportement d'avant.
 */
const ROLES_SYSTEME: Role[] = [
  { code: "membre", couleur: "gris", ordre: 10 },
  { code: "contributeur", couleur: "bleu", ordre: 20 },
  { code: "moderateur", couleur: "ambre", ordre: 30 },
  { code: "admin", couleur: "violet", ordre: 40 },
].map(({ code, couleur, ordre }) => ({
  code,
  nom: { fr: code },
  description: {},
  role_base: code as RoleUtilisateur,
  permissions: [],
  couleur: couleur as CouleurRole,
  systeme: true,
  ordre,
}));

export async function chargerRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from("roles").select("code, nom, description, role_base, permissions, couleur, systeme, ordre").order("ordre");
  if (error) {
    // Table absente (migration non appliquée) : rôles système seulement.
    if (error.code === "42P01" || error.code === "PGRST205") return ROLES_SYSTEME;
    throw error;
  }
  return (data ?? []) as Role[];
}

/** Rôle du profil : `role_code` (rôle personnalisé possible), sinon son niveau de base. */
export const codeRole = (profil: Pick<Profil, "role"> & { role_code?: string | null }) => profil.role_code ?? profil.role;

export const trouverRole = (roles: Role[] | undefined, code: string) => roles?.find((role) => role.code === code);

/** Un rôle système a son nom traduit dans `admin.roles.*` ; un rôle personnalisé porte ses noms fr / en / ar. */
export function nomRole(role: Role | undefined, code: string, langue: string, traduire: (cle: string) => string): string {
  if (!role || role.systeme) return traduire(`admin.roles.${code}`);
  return (role.nom as Record<string, string | undefined>)[langue] || role.nom.fr;
}

export function descriptionRole(role: Role | undefined, code: string, langue: string, traduire: (cle: string) => string): string {
  if (!role || role.systeme) return traduire(`admin.descriptions.${code}`);
  const description = role.description as Record<string, string | undefined>;
  return description[langue] || description.fr || "";
}

/** Permissions effectives d'un membre : toutes pour un administrateur, sinon celles de son rôle. */
export function permissionsMembre(profil: (Pick<Profil, "role"> & { role_code?: string | null }) | null, roles: Role[] | undefined): Set<Permission> {
  if (!profil) return new Set();
  if (profil.role === "admin") return new Set(PERMISSIONS);
  return new Set(trouverRole(roles, codeRole(profil))?.permissions ?? []);
}

/** Code tiré du nom : minuscules, sans accents, tirets (format imposé par la base : 2 à 40 caractères). */
export function codeDepuisNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const FORMAT_CODE_ROLE = /^[a-z0-9][a-z0-9_-]{1,39}$/;

export async function enregistrerRole(champs: ChampsRole): Promise<Role> {
  const { data, error } = await supabase.rpc("enregistrer_role", {
    p_code: champs.code,
    p_nom: champs.nom,
    p_description: champs.description,
    p_role_base: champs.role_base,
    p_permissions: champs.permissions,
    p_couleur: champs.couleur,
  });
  if (error) throw error;
  return data as Role;
}

export async function supprimerRole(code: string): Promise<void> {
  const { error } = await supabase.rpc("supprimer_role", { p_code: code });
  if (error) throw error;
}
