import { supabase } from "./supabase";

export type RoleUtilisateur = "membre" | "contributeur" | "moderateur" | "admin";

export interface Profil {
  id: string;
  pseudo: string;
  nom_affiche: string | null;
  avatar_url: string | null;
  bio: string | null;
  site_web: string | null;
  role: RoleUtilisateur;
  cree_le: string;
}

/** Champs qu'un membre peut modifier sur son propre profil (droits accordés par la base). */
export type ChampsModifiables = Pick<Profil, "pseudo" | "nom_affiche" | "bio" | "site_web">;

const COLONNES_PROFIL = "id, pseudo, nom_affiche, avatar_url, bio, site_web, role, cree_le";

// Mêmes règles que les contraintes de la table profils.
export const FORMAT_PSEUDO = /^[a-z0-9_-]{3,30}$/;
export const LONGUEUR_MAX_BIO = 500;
export const LONGUEUR_MAX_NOM = 80;
export const FORMAT_SITE_WEB = /^https?:\/\/[^\s]+$/i;

export const TYPES_AVATAR = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const TAILLE_MAX_AVATAR = 2 * 1024 * 1024;
const EXTENSIONS_AVATAR: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function chargerProfil(id: string): Promise<Profil | null> {
  const { data, error } = await supabase.from("profils").select(COLONNES_PROFIL).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Profil | null;
}

export async function chargerMembre(pseudo: string): Promise<Profil | null> {
  const { data, error } = await supabase
    .from("profils")
    .select(COLONNES_PROFIL)
    .eq("pseudo", pseudo.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as Profil | null;
}

export const normaliserPseudo = (pseudo: string) => pseudo.trim().toLowerCase();

export type EtatPseudo = "valide" | "format" | "reserve" | "pris";

/** Vérifie un pseudo avant l'envoi : format, nom réservé (rpc pseudo_reserve) et disponibilité. */
export async function verifierPseudo(pseudo: string, idActuel: string): Promise<EtatPseudo> {
  if (!FORMAT_PSEUDO.test(pseudo)) return "format";

  const { data: reserve, error: erreurReserve } = await supabase.rpc("pseudo_reserve", { pseudo });
  if (erreurReserve) throw erreurReserve;
  if (reserve) return "reserve";

  const { data, error } = await supabase.from("profils").select("id").eq("pseudo", pseudo).neq("id", idActuel).limit(1);
  if (error) throw error;
  return data.length > 0 ? "pris" : "valide";
}

/** Ajoute https:// à un site saisi sans protocole ; chaîne vide → null. */
export function normaliserSiteWeb(valeur: string): string | null {
  const site = valeur.trim();
  if (!site) return null;
  return /^[a-z][a-z0-9+.-]*:/i.test(site) ? site : `https://${site}`;
}

export async function mettreAJourProfil(id: string, champs: ChampsModifiables): Promise<void> {
  const { error } = await supabase.from("profils").update(champs).eq("id", id);
  if (error) throw error;
}

export type ProblemeAvatar = "format" | "taille";

export function verifierFichierAvatar(fichier: File): ProblemeAvatar | null {
  if (!TYPES_AVATAR.includes(fichier.type)) return "format";
  if (fichier.size > TAILLE_MAX_AVATAR) return "taille";
  return null;
}

/** Chemin dans le bucket avatars si l'URL est un avatar de cet utilisateur (sinon null : Google, ancien site…). */
function cheminAvatarDepuisUrl(url: string | null, idUtilisateur: string): string | null {
  if (!url) return null;
  const prefixe = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/`;
  if (!url.startsWith(prefixe)) return null;
  const chemin = decodeURIComponent(url.slice(prefixe.length).split("?")[0]);
  return chemin.startsWith(`${idUtilisateur}/`) ? chemin : null;
}

async function supprimerFichierAvatar(chemin: string | null) {
  if (!chemin) return;
  // Un échec de suppression ne doit pas bloquer : l'ancien fichier reste simplement orphelin.
  const { error } = await supabase.storage.from("avatars").remove([chemin]);
  if (error) console.warn("Ancien avatar non supprimé :", chemin, error.message);
}

/**
 * Envoie un nouvel avatar dans avatars/<uid>/avatar-<horodatage>.<ext>, met à jour avatar_url,
 * puis supprime l'ancien fichier. Renvoie la nouvelle URL publique.
 */
export async function envoyerAvatar(idUtilisateur: string, fichier: File, ancienneUrl: string | null): Promise<string> {
  const chemin = `${idUtilisateur}/avatar-${Date.now()}.${EXTENSIONS_AVATAR[fichier.type]}`;

  const { error: erreurEnvoi } = await supabase.storage
    .from("avatars")
    .upload(chemin, fichier, { contentType: fichier.type, cacheControl: "3600", upsert: false });
  if (erreurEnvoi) throw erreurEnvoi;

  const { data } = supabase.storage.from("avatars").getPublicUrl(chemin);

  const { error: erreurProfil } = await supabase.from("profils").update({ avatar_url: data.publicUrl }).eq("id", idUtilisateur);
  if (erreurProfil) {
    await supprimerFichierAvatar(chemin);
    throw erreurProfil;
  }

  await supprimerFichierAvatar(cheminAvatarDepuisUrl(ancienneUrl, idUtilisateur));
  return data.publicUrl;
}

export async function retirerAvatar(idUtilisateur: string, ancienneUrl: string | null): Promise<void> {
  const { error } = await supabase.from("profils").update({ avatar_url: null }).eq("id", idUtilisateur);
  if (error) throw error;
  await supprimerFichierAvatar(cheminAvatarDepuisUrl(ancienneUrl, idUtilisateur));
}

/** Initiales affichées quand il n'y a pas d'avatar. */
export function initiales(profil: Pick<Profil, "pseudo" | "nom_affiche">): string {
  const source = profil.nom_affiche?.trim() || profil.pseudo;
  const mots = source.split(/[\s_-]+/).filter(Boolean);
  const lettres = mots.length > 1 ? mots[0][0] + mots[1][0] : source.slice(0, 2);
  return lettres.toUpperCase();
}
