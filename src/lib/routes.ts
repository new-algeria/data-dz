// Chemins du site, en anglais. Les noms restent en français dans le code : on écrit routes.connexion,
// jamais "/login" en dur. Les anciennes URL françaises redirigent vers celles-ci (voir App.tsx).

export const routes = {
  accueil: "/",
  catalogue: "/#catalog",
  donnee: (slug: string) => `/datasets/${encodeURIComponent(slug)}`,
  membre: (pseudo: string) => `/members/${encodeURIComponent(pseudo)}`,
  profil: "/profile",
  connexion: "/login",
  inscription: "/signup",
  motDePasseOublie: "/forgot-password",
  nouveauMotDePasse: "/reset-password",
  retourAuth: "/auth/callback",
  confidentialite: "/privacy",
  conditions: "/terms",
  proposer: "/submit",
  mesPropositions: "/my-submissions",
  maProposition: (id: string) => `/my-submissions/${id}`,
  moderation: "/moderation",
  moderationProposition: (id: string) => `/moderation/submissions/${id}`,
  moderationDatasets: "/moderation/datasets",
  favoris: "/favorites",
} as const;

/** Catalogue filtré sur une catégorie. */
export const catalogueParCategorie = (slug: string) => `/?category=${encodeURIComponent(slug)}#catalog`;

/** Paramètre d'URL portant la page où revenir après connexion (« next »). L'ancien « suite » reste lu. */
export const PARAMETRE_SUITE = "next";
export const ANCIEN_PARAMETRE_SUITE = "suite";

/** Ajoute ?next=<page> à un chemin. */
export const avecSuite = (chemin: string, suite: string) => `${chemin}?${PARAMETRE_SUITE}=${encodeURIComponent(suite)}`;
