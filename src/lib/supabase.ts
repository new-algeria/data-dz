import { createClient } from "@supabase/supabase-js";

// Client unique du site : seule la clé publishable (protégée par la RLS) est utilisée ici.
const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
const clePublishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!urlSupabase || !clePublishable) {
  // createClient refuse une URL vide : on garde une adresse invalide pour que le site
  // affiche ses états d'erreur au lieu d'une page blanche.
  console.error(
    "VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY manquant : copier .env.example en .env.local."
  );
}

export const supabase = createClient(urlSupabase || "https://configuration-manquante.invalid", clePublishable || "absente", {
  auth: {
    // Flux PKCE : les liens des emails et de Google reviennent avec un `?code=` échangé contre une session
    // au chargement de la page (detectSessionInUrl). Le lien doit être ouvert dans le même navigateur.
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// L'événement PASSWORD_RECOVERY peut être émis avant l'affichage de React : on l'écoute dès maintenant.
let recuperationMotDePasse = false;
supabase.auth.onAuthStateChange((evenement) => {
  if (evenement === "PASSWORD_RECOVERY") recuperationMotDePasse = true;
  if (evenement === "SIGNED_OUT") recuperationMotDePasse = false;
});

/** Vrai si la session courante vient d'un lien « mot de passe oublié ». */
export const estEnRecuperationMotDePasse = () => recuperationMotDePasse;

export const terminerRecuperationMotDePasse = () => {
  recuperationMotDePasse = false;
};
