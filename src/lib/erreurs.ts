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
  ["soumissions_source_url_check", "sourceUrlInvalide"],
  ["soumissions_source_nom_check", "sourceNomTropLong"],
  ["soumissions_message_check", "messageTropLong"],
  ["revues_commentaire_check", "commentaireTropLong"],
];

// Exceptions levées par les fonctions rpc de la communauté (messages écrits en français dans la base).
const parMessageRpc: [RegExp, string][] = [
  [/commentaire est obligatoire/i, "commentaireObligatoire"],
  [/déjà traitée/i, "dejaTraitee"],
  [/propre proposition/i, "propreProposition"],
  [/réservé aux modérateurs/i, "reserveModerateurs"],
  [/peut être renvoyée|peut être retirée/i, "actionPlusPossible"],
  [/trop de commentaires/i, "tropDeCommentaires"],
  [/répondre qu'à un commentaire principal|même donnée que le commentaire/i, "reponseImpossible"],
  [/introuvable/i, "introuvable"],
];

export function cleErreur(erreur: unknown): string {
  const e = (erreur ?? {}) as ErreurSupabase;
  const message = String(e.message ?? "");
  const codeDetaille = typeof e.details === "object" ? e.details?.code : undefined;
  const code = codeDetaille ?? e.code;

  const messageRpc = parMessageRpc.find(([motif]) => motif.test(message));
  if (messageRpc) return `erreurs.${messageRpc[1]}`;
  if (code === "23505") return /pseudo/i.test(message) ? "erreurs.pseudoPris" : "erreurs.doublon";
  if (code === "23514") {
    const contrainte = parContrainte.find(([nom]) => message.includes(nom));
    if (contrainte) return `erreurs.${contrainte[1]}`;
    return /profils/i.test(message) ? "erreurs.pseudoReserveOuInvalide" : "erreurs.valeurInvalide";
  }
  // Refus de la RLS : l'action n'est pas (ou plus) autorisée pour ce compte.
  if (code === "42501" || /row-level security/i.test(message)) return "erreurs.nonAutorise";
  if (/already exists|duplicate/i.test(message)) return "erreurs.doublon";
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

/** Variante pour les fichiers des propositions (les messages de taille et de format ne parlent pas d'image). */
export function cleErreurFichier(erreur: unknown): string {
  const cle = cleErreur(erreur);
  if (cle === "erreurs.imageTropLourde") return "erreurs.fichierTropLourd";
  if (cle === "erreurs.formatImage") return "erreurs.formatFichier";
  if (cle === "erreurs.doublon") return "erreurs.fichierExiste";
  return cle;
}
