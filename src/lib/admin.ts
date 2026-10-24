import { supabase } from "./supabase";
import type { RoleUtilisateur } from "./profils";

// Gestion des membres par les administrateurs (rpc changer_role — migration 20261023000007).
// La liste vient de la table profils (lisible par tous) ; seul le changement de rôle est réservé, et vérifié par la base.

export const ROLES: RoleUtilisateur[] = ["membre", "contributeur", "moderateur", "admin"];
/** Rôles qu'un administrateur peut donner depuis le site (« admin » reste manuel). */
export const ROLES_ATTRIBUABLES: RoleUtilisateur[] = ["membre", "contributeur", "moderateur"];
export const MEMBRES_PAR_PAGE = 25;

export interface MembreAdmin {
  id: string;
  pseudo: string;
  nom_affiche: string | null;
  avatar_url: string | null;
  role: RoleUtilisateur;
  reputation: number | null;
  cree_le: string;
}

export interface FiltresMembres {
  terme: string;
  role: RoleUtilisateur | null;
  page: number;
}

/** Garde lettres, chiffres, espace, « - », « _ » et « . » : la recherche est injectée dans un filtre PostgREST `or=(…)`. */
const nettoyerRecherche = (terme: string) => terme.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 60);

export async function chargerMembres({ terme, role, page }: FiltresMembres): Promise<{ membres: MembreAdmin[]; total: number }> {
  let requete = supabase
    .from("profils")
    .select("id, pseudo, nom_affiche, avatar_url, role, reputation, cree_le", { count: "exact" });
  const recherche = nettoyerRecherche(terme);
  if (recherche) requete = requete.or(`pseudo.ilike.*${recherche}*,nom_affiche.ilike.*${recherche}*`);
  if (role) requete = requete.eq("role", role);
  const debut = page * MEMBRES_PAR_PAGE;
  const { data, error, count } = await requete
    .order("cree_le", { ascending: false })
    .range(debut, debut + MEMBRES_PAR_PAGE - 1);
  if (error) throw error;
  return { membres: (data ?? []) as MembreAdmin[], total: count ?? 0 };
}

export async function changerRole(utilisateurId: string, nouveauRole: RoleUtilisateur): Promise<void> {
  const { error } = await supabase.rpc("changer_role", { utilisateur_id: utilisateurId, nouveau_role: nouveauRole });
  if (error) throw error;
}
