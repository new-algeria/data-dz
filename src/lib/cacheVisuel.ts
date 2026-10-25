import type { DetectionVisuel } from "./detecterVisuel";
import type { Fichier } from "./types";

// Cache de la détection dans le navigateur : même fichier (même nom, même taille) → même résultat,
// sans retélécharger le fichier. Mémoire pour la visite, localStorage d'une visite à l'autre.

export interface EntreeVisuel {
  detection: DetectionVisuel;
}

const CLE_STOCKAGE = "data-dz:visuels:v1";
const MAX_ENTREES = 150;
const memoire = new Map<string, EntreeVisuel>();

/** Clé d'un jeu : slug + fichiers retenus pour le visuel, avec leur taille (un nouveau fichier change la clé). */
export const cleVisuel = (slug: string, fichiers: (Fichier | null)[]) =>
  [slug, ...fichiers.map((fichier) => (fichier ? `${fichier.id}:${fichier.taille_octets ?? "?"}` : "-"))].join("|");

function lireStockage(): Record<string, EntreeVisuel> {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    const valeur = brut ? JSON.parse(brut) : null;
    return valeur && typeof valeur === "object" ? valeur : {};
  } catch {
    return {};
  }
}

export function lireVisuel(cle: string): EntreeVisuel | null {
  const enMemoire = memoire.get(cle);
  if (enMemoire) return enMemoire;
  const stocke = lireStockage()[cle];
  if (stocke?.detection) {
    memoire.set(cle, stocke);
    return stocke;
  }
  return null;
}

export function ecrireVisuel(cle: string, entree: EntreeVisuel): void {
  const complete = { ...lireVisuel(cle), ...entree };
  memoire.set(cle, complete);
  try {
    const stockage = lireStockage();
    delete stockage[cle];
    stockage[cle] = complete;
    // Les plus anciennes entrées partent en premier (ordre d'insertion des clés).
    const cles = Object.keys(stockage);
    for (const ancienne of cles.slice(0, Math.max(0, cles.length - MAX_ENTREES))) delete stockage[ancienne];
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(stockage));
  } catch {
    // Stockage plein ou interdit (navigation privée) : le cache en mémoire suffit.
  }
}
