import type { Session, User } from "@supabase/supabase-js";
import { URL_API } from "./api";

/**
 * Signale une nouvelle inscription à l'équipe New Algeria (email envoyé par l'API, POST /v1/members/registered).
 * Même code sur New Algeria, avec `site: "new-algeria"`. L'API décide seule (jeton vérifié, une seule fois par compte) :
 * ce filtre évite seulement des appels inutiles.
 */
export const SITE_INSCRIPTION = "data-dz";

/** Même délai que l'API : les comptes plus anciens (d'avant cette fonction) ne sont jamais signalés. */
const DELAI_INSCRIPTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLE_SESSION = "data-dz:inscription-signalee:";

export function doitSignalerInscription(utilisateur: Pick<User, "created_at" | "app_metadata">, maintenant = Date.now()): boolean {
  if (utilisateur.app_metadata?.inscription_signalee === true) return false;
  const creation = Date.parse(utilisateur.created_at);
  return !Number.isNaN(creation) && maintenant - creation <= DELAI_INSCRIPTION_MS;
}

/** Appel unique par onglet ; une erreur (API pas encore déployée, réseau…) est ignorée sans gêner le membre. */
export async function signalerInscription(session: Session): Promise<void> {
  if (!doitSignalerInscription(session.user)) return;
  const cle = `${CLE_SESSION}${session.user.id}`;
  try {
    if (sessionStorage.getItem(cle)) return;
    sessionStorage.setItem(cle, "1");
  } catch {
    // Stockage bloqué : l'API garantit de toute façon un seul email par compte.
  }
  try {
    await fetch(`${URL_API}/v1/members/registered`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ site: SITE_INSCRIPTION }),
    });
  } catch {
    // Sans conséquence pour le membre.
  }
}
