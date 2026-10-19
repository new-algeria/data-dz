import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profil } from "@/lib/profils";

export interface ValeurAuth {
  session: Session | null;
  utilisateur: User | null;
  /** Profil public de l'utilisateur connecté (table profils), null tant qu'il n'est pas chargé. */
  profil: Profil | null;
  /** Vrai tant que la session initiale n'est pas connue (lecture du stockage, échange d'un ?code=). */
  chargement: boolean;
  chargementProfil: boolean;
  /** Vrai quand la session vient d'un lien « mot de passe oublié » (événement PASSWORD_RECOVERY). */
  recuperation: boolean;
  terminerRecuperation: () => void;
  rechargerProfil: () => Promise<unknown>;
}

export const ContexteAuth = createContext<ValeurAuth | null>(null);

export function useAuth(): ValeurAuth {
  const valeur = useContext(ContexteAuth);
  if (!valeur) throw new Error("useAuth doit être utilisé dans <FournisseurAuth>.");
  return valeur;
}
