import { ErreurApi } from "./api";

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
