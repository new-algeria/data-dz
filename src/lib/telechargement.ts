import { ErreurApi } from "./api";
import { routes } from "./routes";

/**
 * Vérifie le lien avant d'ouvrir le téléchargement : l'API répond 302 (fichier prêt, éventuellement converti)
 * ou une erreur lisible (ex. pas de coordonnées pour un GeoJSON). Sans cette étape, l'erreur s'afficherait
 * en JSON brut dans un nouvel onglet.
 */
export async function verifierLien(url: string): Promise<void> {
  const reponse = await fetch(url, { redirect: "manual" });
  if (reponse.type === "opaqueredirect" || (reponse.status >= 300 && reponse.status < 400)) return;
  const corps = await reponse.json().catch(() => null);
  throw new ErreurApi(reponse.status, corps?.code ?? "http_error", corps?.title ?? `HTTP ${reponse.status}`);
}

/** Paramètre d'URL d'une fiche qui rouvre le dialogue de téléchargement sur un fichier (retour de connexion). */
export const PARAMETRE_TELECHARGEMENT = "download";

/**
 * Page où revenir après la connexion demandée pour télécharger : la fiche de la donnée, qui rouvre le dialogue
 * sur le fichier choisi. Même chemin depuis le catalogue, la liste des fichiers ou l'en-tête de la fiche.
 */
export const lienRetourTelechargement = (slug: string, nom: string) =>
  `${routes.donnee(slug)}?${PARAMETRE_TELECHARGEMENT}=${encodeURIComponent(nom)}`;

/** Fichier à rouvrir d'après la valeur du paramètre, s'il fait bien partie de la donnée ; sinon `null`. */
export function fichierDemande(valeur: string | null, noms: string[]): string | null {
  return valeur && noms.includes(valeur) ? valeur : null;
}
