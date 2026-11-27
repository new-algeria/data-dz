import { supabase } from "./supabase";
import { fonctionAbsente } from "./contributions";

/**
 * Suppression de son propre compte (droit à l'effacement, loi 18-07) : fichiers du membre d'abord (avatar,
 * fichiers de ses propositions, avec ses propres droits de stockage), puis rpc("supprimer_mon_compte")
 * (migration 20261201000040), qui supprime le profil et le compte, puis déconnexion.
 */

export type ErreurSuppression = "admin" | "indisponible" | "inconnue";

export class SuppressionImpossible extends Error {
  constructor(public raison: ErreurSuppression) {
    super(raison);
  }
}

/** La confirmation est le pseudo du membre, sans casse ni espaces autour. */
export const confirmationValide = (saisie: string, pseudo: string) => pseudo.length > 0 && saisie.trim().toLowerCase() === pseudo.toLowerCase();

export function raisonErreur(erreur: { code?: string } | null): ErreurSuppression {
  if (erreur?.code === "DZ001") return "admin";
  if (fonctionAbsente(erreur)) return "indisponible";
  return "inconnue";
}

/** Chemins complets des fichiers d'un dossier de stockage (les entrées sans `id` sont des sous-dossiers). */
export const cheminsFichiers = (dossier: string, entrees: { name: string; id: string | null }[]) =>
  entrees.filter((entree) => entree.id).map((entree) => `${dossier}/${entree.name}`);

export const sousDossiers = (dossier: string, entrees: { name: string; id: string | null }[]) =>
  entrees.filter((entree) => !entree.id).map((entree) => `${dossier}/${entree.name}`);

/** Vide un dossier d'un bucket (un niveau de sous-dossiers). Un échec ne bloque pas la suppression du compte. */
async function viderDossier(bucket: string, dossier: string) {
  try {
    const stockage = supabase.storage.from(bucket);
    const { data: entrees } = await stockage.list(dossier, { limit: 1000 });
    const chemins = cheminsFichiers(dossier, entrees ?? []);
    for (const sousDossier of sousDossiers(dossier, entrees ?? [])) {
      const { data } = await stockage.list(sousDossier, { limit: 1000 });
      chemins.push(...cheminsFichiers(sousDossier, data ?? []));
    }
    if (chemins.length > 0) await stockage.remove(chemins);
  } catch (erreur) {
    console.warn(`Fichiers de ${bucket}/${dossier} non supprimés :`, erreur);
  }
}

export async function supprimerMonCompte(idUtilisateur: string): Promise<void> {
  await viderDossier("avatars", idUtilisateur);
  await viderDossier("soumissions", idUtilisateur);
  const { error } = await supabase.rpc("supprimer_mon_compte");
  if (error) throw new SuppressionImpossible(raisonErreur(error));
  await supabase.auth.signOut({ scope: "local" });
}
