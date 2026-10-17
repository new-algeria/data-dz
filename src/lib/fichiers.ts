import type { Fichier } from "./types";

const urlFichiers = (import.meta.env.VITE_URL_FICHIERS ?? "https://files.data-dz.com").replace(/\/+$/, "");

/** URL publique d'un fichier stocké sur R2 (lecture directe sur files.data-dz.com). */
export function urlFichier(cleStockage: string): string {
  return `${urlFichiers}/${cleStockage.replace(/^\/+/, "")}`;
}

/** Locale utilisée pour les nombres (chiffres latins, y compris en arabe). */
export function localeNombres(langue: string): string {
  if (langue === "ar") return "ar-DZ-u-nu-latn";
  if (langue === "en") return "en-US";
  return "fr-FR";
}

export function formaterNombre(valeur: number, langue: string): string {
  return new Intl.NumberFormat(localeNombres(langue)).format(valeur);
}

const unitesTaille = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;

/** Taille lisible (ex. « 1,2 Mo ») ; les unités sont traduites par Intl. */
export function formaterTaille(octets: number | null | undefined, langue: string): string {
  if (octets === null || octets === undefined) return "";
  let valeur = octets;
  let indice = 0;
  while (valeur >= 1024 && indice < unitesTaille.length - 1) {
    valeur /= 1024;
    indice++;
  }
  return new Intl.NumberFormat(localeNombres(langue), {
    style: "unit",
    unit: unitesTaille[indice],
    unitDisplay: "short",
    maximumFractionDigits: indice === 0 ? 0 : 1,
  }).format(valeur);
}

/** Fichier principal en premier, puis ordre alphabétique. */
export function trierFichiers(fichiers: Fichier[]): Fichier[] {
  return [...fichiers].sort((a, b) => {
    if (a.principal !== b.principal) return a.principal ? -1 : 1;
    return (a.nom ?? a.cle_stockage).localeCompare(b.nom ?? b.cle_stockage);
  });
}
