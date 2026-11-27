import type { User } from "@supabase/supabase-js";
import { PARAMETRE_TELECHARGEMENT } from "./telechargement";
import { routes } from "./routes";

/**
 * Accueil d'un nouveau membre, une seule fois par compte (mémorisé dans le navigateur) : grande fenêtre
 * « Bienvenue <prénom> » s'il arrive sur une page neutre, simple message s'il s'est inscrit pour faire
 * quelque chose (télécharger un fichier, lire une réponse de DjazAI, proposer une donnée), pour ne pas
 * se mettre entre lui et ce qu'il venait chercher. Fonctions pures, testées.
 */

/** Un compte de moins de 7 jours est « nouveau » (même délai que l'email « nouvel inscrit »). */
const DELAI_NOUVEAU_COMPTE_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIXE_CLE = "data-dz:bienvenue:v1:";

export type ModeBienvenue = "fenetre" | "message-telechargement" | "message";

export const cleBienvenue = (idUtilisateur: string) => `${PREFIXE_CLE}${idUtilisateur}`;

export function estNouveauCompte(utilisateur: Pick<User, "created_at">, maintenant = Date.now()): boolean {
  const creation = Date.parse(utilisateur.created_at);
  return !Number.isNaN(creation) && maintenant - creation >= 0 && maintenant - creation <= DELAI_NOUVEAU_COMPTE_MS;
}

/** Pages où l'on attend la fin de la connexion : l'accueil vient sur la page suivante. */
const PAGES_AUTHENTIFICATION: string[] = [
  routes.connexion,
  routes.inscription,
  routes.motDePasseOublie,
  routes.nouveauMotDePasse,
  routes.retourAuth,
];

export const estPageAuthentification = (chemin: string) => PAGES_AUTHENTIFICATION.includes(chemin.replace(/\/+$/, "") || "/");

/** Fenêtre ou simple message, selon ce que le membre venait faire. `null` : pas encore (page de connexion). */
export function modeBienvenue(chemin: string, recherche: string): ModeBienvenue | null {
  if (estPageAuthentification(chemin)) return null;
  if (new URLSearchParams(recherche).has(PARAMETRE_TELECHARGEMENT)) return "message-telechargement";
  const debutDe = (prefixe: string) => chemin === prefixe || chemin.startsWith(`${prefixe}/`);
  if (debutDe(routes.djazai) || debutDe(routes.proposer)) return "message";
  return "fenetre";
}

interface ProfilNom {
  pseudo?: string | null;
  nom_affiche?: string | null;
}

/** Prénom à afficher : premier mot du nom affiché, sinon du nom donné par Google / Facebook, sinon le pseudo. */
export function prenomBienvenue(profil: ProfilNom | null | undefined, utilisateur: Pick<User, "user_metadata"> | null): string | null {
  const metadonnees = utilisateur?.user_metadata ?? {};
  const candidats = [profil?.nom_affiche, metadonnees.full_name, metadonnees.name, profil?.pseudo];
  for (const candidat of candidats) {
    const premier = typeof candidat === "string" ? candidat.trim().split(/\s+/)[0] : "";
    if (premier) return premier.slice(0, 24);
  }
  return null;
}
