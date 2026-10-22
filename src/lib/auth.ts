import { supabase } from "./supabase";
import { cleErreur } from "./erreurs";
import { PARAMETRE_SUITE, routes } from "./routes";

// Pages d'authentification vers lesquelles il est inutile de revenir après connexion
// (avec leurs anciennes URL françaises, encore présentes dans des liens déjà envoyés).
const PAGES_AUTH = [
  routes.connexion,
  routes.inscription,
  routes.motDePasseOublie,
  routes.nouveauMotDePasse,
  routes.retourAuth,
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/nouveau-mot-de-passe",
  "/auth/retour",
];

/**
 * Chemin interne sûr pour rediriger après connexion : refuse les URL externes (`//site`, `https://…`)
 * pour éviter les redirections ouvertes, et les pages d'authentification elles-mêmes.
 */
export function suiteSure(valeur: string | null | undefined, defaut = "/"): string {
  if (!valeur || !valeur.startsWith("/") || valeur.startsWith("//") || valeur.startsWith("/\\")) return defaut;
  if (PAGES_AUTH.some((page) => valeur === page || valeur.startsWith(`${page}?`) || valeur.startsWith(`${page}/`))) {
    return defaut;
  }
  return valeur;
}

/** URL de retour après un lien email ou Google : fonctionne en local, sur les aperçus Vercel et en production. */
export function urlRetour(suite: string): string {
  return `${window.location.origin}${routes.retourAuth}?${PARAMETRE_SUITE}=${encodeURIComponent(suiteSure(suite))}`;
}

export async function inscrire(email: string, motDePasse: string, suite: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: { emailRedirectTo: urlRetour(suite) },
  });
  if (error) throw error;
  // Avec la confirmation d'email activée, Supabase ne signale pas un email déjà inscrit :
  // il renvoie un utilisateur sans identité (pour ne pas révéler l'existence du compte).
  const compteExistant = Boolean(data.user && data.user.identities?.length === 0);
  return { session: data.session, compteExistant };
}

export async function renvoyerConfirmation(email: string, suite: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: urlRetour(suite) },
  });
  if (error) throw error;
}

export async function connecterParMotDePasse(email: string, motDePasse: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error) throw error;
}

export async function envoyerLienMagique(email: string, suite: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Le lien magique sert à se connecter : il ne crée pas de compte (l'inscription a sa propre page).
    options: { emailRedirectTo: urlRetour(suite), shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function connecterAvecGoogle(suite: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: urlRetour(suite) },
  });
  if (error) throw error;
}

/** Fournisseurs activés dans Supabase (Authentication → Providers), lus depuis l'API publique d'Auth. */
export async function chargerFournisseursActifs(): Promise<Record<string, boolean>> {
  const reponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  const reglages = (await reponse.json()) as { external?: Record<string, boolean> };
  return reglages.external ?? {};
}

export async function envoyerLienReinitialisation(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${routes.nouveauMotDePasse}`,
  });
  if (error) throw error;
}

export async function changerMotDePasse(motDePasse: string) {
  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) throw error;
}

export async function deconnecter() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export const LONGUEUR_MIN_MOT_DE_PASSE = 8;

/** Erreur renvoyée par Supabase dans l'URL (?error_code=otp_expired… ou dans le #fragment), traduite. */
export function lireErreurUrl(): string | null {
  const requete = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const code = requete.get("error_code") ?? fragment.get("error_code");
  const erreur = requete.get("error") ?? fragment.get("error");
  if (!code && !erreur) return null;
  const description = requete.get("error_description") ?? fragment.get("error_description") ?? "";
  return cleErreur({ code: code ?? (erreur === "access_denied" ? "otp_expired" : erreur ?? undefined), message: description });
}
