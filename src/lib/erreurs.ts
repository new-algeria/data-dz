// Traduit les erreurs de Supabase (Auth, base de données, stockage) en clés i18next `erreurs.*`.

interface ErreurSupabase {
  code?: string;
  status?: number;
  statusCode?: string | number;
  message?: string;
  details?: string | { code?: string };
}

const parCodeAuth: Record<string, string> = {
  invalid_credentials: "identifiantsInvalides",
  email_not_confirmed: "emailNonConfirme",
  user_already_exists: "compteExistant",
  email_exists: "compteExistant",
  identity_already_exists: "compteExistant",
  weak_password: "motDePasseFaible",
  same_password: "memeMotDePasse",
  over_request_rate_limit: "tropDeTentatives",
  over_email_send_rate_limit: "tropDeTentatives",
  otp_expired: "lienExpire",
  flow_state_expired: "lienExpire",
  flow_state_not_found: "lienExpire",
  bad_code_verifier: "lienAutreNavigateur",
  otp_disabled: "aucunCompte",
  signup_disabled: "inscriptionsFermees",
  email_address_invalid: "emailInvalide",
  provider_disabled: "googleIndisponible",
  session_not_found: "sessionExpiree",
  session_expired: "sessionExpiree",
};

// Contraintes CHECK de la table profils (code Postgres 23514).
const parContrainte: [string, string][] = [
  ["profils_pseudo_non_reserve", "pseudoReserve"],
  ["profils_pseudo_check", "pseudoInvalide"],
  ["profils_site_web_http", "siteWebInvalide"],
  ["profils_avatar_https", "avatarInvalide"],
  ["profils_bio_check", "bioTropLongue"],
  ["profils_nom_affiche_check", "nomTropLong"],
];

export function cleErreur(erreur: unknown): string {
  const e = (erreur ?? {}) as ErreurSupabase;
  const message = String(e.message ?? "");
  const codeDetaille = typeof e.details === "object" ? e.details?.code : undefined;
  const code = codeDetaille ?? e.code;

  if (code === "23505") return "erreurs.pseudoPris";
  if (code === "23514") {
    const contrainte = parContrainte.find(([nom]) => message.includes(nom));
    return `erreurs.${contrainte ? contrainte[1] : "pseudoReserveOuInvalide"}`;
  }
  if (code && parCodeAuth[code]) return `erreurs.${parCodeAuth[code]}`;
  if (e.status === 429 || String(e.statusCode) === "429") return "erreurs.tropDeTentatives";
  if (/provider is not enabled|unsupported provider/i.test(message)) return "erreurs.googleIndisponible";
  if (/signups not allowed for otp/i.test(message)) return "erreurs.aucunCompte";
  if (/payload too large|exceeded the maximum allowed size/i.test(message) || String(e.statusCode) === "413") {
    return "erreurs.imageTropLourde";
  }
  if (/mime type .* is not supported/i.test(message)) return "erreurs.formatImage";
  if (erreur instanceof TypeError || /failed to fetch|networkerror/i.test(message)) return "erreurs.reseau";
  return "erreurs.inconnue";
}
