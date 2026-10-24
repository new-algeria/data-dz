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

/** Nom affiché d'un fichier : son nom en base, sinon le dernier segment de sa clé de stockage. */
export function nomFichier(fichier: Fichier): string {
  return fichier.nom ?? fichier.cle_stockage.split("/").pop() ?? fichier.cle_stockage;
}

/** Même nom sans extension de format : « 5g-mobilis.geojson » et « 5g-mobilis.json » donnent « 5g-mobilis ». */
export function nomSansFormat(fichier: Fichier): string {
  return nomFichier(fichier).replace(/\.(geojson|json|csv|tsv|xlsx|xls|xml|zip|pdf|parquet)$/i, "");
}

// Ordre des formats dans un groupe : le spatial d'abord, puis les formats tabulaires.
const ORDRE_FORMATS = ["geojson", "json", "csv", "xlsx", "xml", "parquet", "zip", "pdf"];
const rangFormat = (format: string) => {
  const rang = ORDRE_FORMATS.indexOf(format.toLowerCase());
  return rang === -1 ? ORDRE_FORMATS.length : rang;
};

/** Un même fichier publié en plusieurs formats (même nom). */
export interface GroupeFichiers {
  cle: string;
  nom: string;
  principal: boolean;
  fichiers: Fichier[];
}

/** Regroupe les formats d'un même fichier ; groupe principal en premier, puis ordre alphabétique. */
export function grouperFichiers(fichiers: Fichier[]): GroupeFichiers[] {
  const groupes = new Map<string, GroupeFichiers>();
  for (const fichier of fichiers) {
    const nom = nomSansFormat(fichier);
    const cle = nom.toLowerCase();
    const groupe = groupes.get(cle) ?? { cle, nom, principal: false, fichiers: [] };
    groupe.fichiers.push(fichier);
    groupe.principal ||= fichier.principal;
    groupes.set(cle, groupe);
  }
  return [...groupes.values()]
    .map((groupe) => ({ ...groupe, fichiers: [...groupe.fichiers].sort((a, b) => rangFormat(a.format) - rangFormat(b.format)) }))
    .sort((a, b) => (a.principal !== b.principal ? (a.principal ? -1 : 1) : a.nom.localeCompare(b.nom, undefined, { numeric: true })));
}
