import { chargerFicheDonnee } from "./catalogue";
import { ecrireVisuel, lireVisuel } from "./cacheVisuel";
import {
  choisirFichierCarte,
  choisirFichierGraphique,
  coordonneesGeojson,
  detecterVisuel,
  extraireLignes,
  lireNombre,
  miniatureGraphique,
  miniaturePoints,
  type Miniature,
} from "./detecterVisuel";
import { chargerJSON } from "@/hooks/use-chargement-fichier";
import type { ResumeDonnee } from "./types";

/** Clé de la miniature d'une carte du catalogue : change dès que la donnée est mise à jour. */
export const cleMiniature = (donnee: Pick<ResumeDonnee, "slug" | "mis_a_jour_le" | "versions">) =>
  `miniature|${donnee.slug}|${donnee.versions?.numero ?? "-"}|${donnee.mis_a_jour_le}`;

export const miniatureEnCache = (cle: string): Miniature | null | undefined => {
  const entree = lireVisuel(cle);
  return entree && "miniature" in entree ? entree.miniature ?? null : undefined;
};

/**
 * Miniature d'une donnée du catalogue : points du GeoJSON (ou des coordonnées du JSON), sinon sparkline
 * du graphique, sinon null (l'illustration reste affichée). Mise en cache dans le navigateur.
 */
export async function calculerMiniature(donnee: Pick<ResumeDonnee, "slug" | "mis_a_jour_le" | "versions">, signal?: AbortSignal): Promise<Miniature | null> {
  const cle = cleMiniature(donnee);
  const enCache = miniatureEnCache(cle);
  if (enCache !== undefined) return enCache;

  const fiche = await chargerFicheDonnee(donnee.slug);
  const fichiers = fiche?.versions?.fichiers ?? [];
  const fichierCarte = choisirFichierCarte(fichiers);
  const fichierJson = choisirFichierGraphique(fichiers);
  let miniature: Miniature | null = null;

  if (fichierCarte) {
    miniature = miniaturePoints(coordonneesGeojson(await chargerJSON({ url: fichierCarte.url, taille: fichierCarte.taille_octets }, signal)));
  } else if (fichierJson) {
    const contenu = await chargerJSON({ url: fichierJson.url, taille: fichierJson.taille_octets }, signal);
    const detection = detecterVisuel(fichiers, contenu);
    const lignes = extraireLignes(contenu) ?? [];
    const carte = detection.carte;
    if (carte?.genre === "points" && carte.origine === "json") {
      const coordonnees = lignes.flatMap((ligne) => {
        const lon = lireNombre(ligne[carte.longitude]);
        const lat = lireNombre(ligne[carte.latitude]);
        return lon !== null && lat !== null ? [[lon, lat] as [number, number]] : [];
      });
      miniature = miniaturePoints(coordonnees);
    } else if (detection.graphique) {
      miniature = miniatureGraphique(lignes, detection.graphique);
    }
  }

  ecrireVisuel(cle, { miniature });
  return miniature;
}
