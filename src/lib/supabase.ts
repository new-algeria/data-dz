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
    // Pas encore d'authentification sur le site : inutile de garder une session.
    persistSession: false,
    autoRefreshToken: false,
  },
});
