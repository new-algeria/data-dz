import { supabase } from "./supabase";
import { avecRoleCode, type RoleUtilisateur } from "./profils";

// Gestion des membres (rpc changer_role — migrations 20261023000007 puis 20261102000016 pour les rôles personnalisés).
// La liste vient de la table profils (lisible par tous) ; seul le changement de rôle est réservé, et vérifié par la base :
// un admin donne tout rôle sauf « admin », un membre qui a la permission membres.gerer seulement des rôles sans permission.

export const MEMBRES_PAR_PAGE = 25;

export interface MembreAdmin {
  id: string;
  pseudo: string;
  nom_affiche: string | null;
  avatar_url: string | null;
  role: RoleUtilisateur;
  role_code?: string | null;
  reputation: number | null;
  cree_le: string;
}

export interface FiltresMembres {
  terme: string;
  /** Code du rôle (système ou personnalisé). */
  role: string | null;
  page: number;
}

/** Garde lettres, chiffres, espace, « - », « _ » et « . » : la recherche est injectée dans un filtre PostgREST `or=(…)`. */
const nettoyerRecherche = (terme: string) => terme.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 60);

export async function chargerMembres({ terme, role, page }: FiltresMembres): Promise<{ membres: MembreAdmin[]; total: number }> {
  const recherche = nettoyerRecherche(terme);
  const debut = page * MEMBRES_PAR_PAGE;
  return avecRoleCode("id, pseudo, nom_affiche, avatar_url, role, reputation, cree_le", async (select) => {
    let requete = supabase.from("profils").select(select, { count: "exact" });
    if (recherche) requete = requete.or(`pseudo.ilike.*${recherche}*,nom_affiche.ilike.*${recherche}*`);
    // Avant la migration, seul le niveau de base existe : on filtre dessus.
    if (role) requete = select.includes("role_code") ? requete.eq("role_code", role) : requete.eq("role", role);
    const { data, error, count } = await requete.order("cree_le", { ascending: false }).range(debut, debut + MEMBRES_PAR_PAGE - 1);
    return { data: { membres: (data ?? []) as unknown as MembreAdmin[], total: count ?? 0 }, error };
  });
}

export async function changerRole(utilisateurId: string, nouveauRole: string): Promise<void> {
  const { error } = await supabase.rpc("changer_role", { utilisateur_id: utilisateurId, nouveau_role: nouveauRole });
  if (error) throw error;
}
