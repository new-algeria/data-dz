/**
 * Unité du grand chiffre des cartes du catalogue (« 586 plages », « 2 170 stations »), devinée à partir du titre
 * dans la langue affichée. Repli : « éléments » / « elements » / « عناصر ».
 */

export type LangueUnite = "fr" | "en" | "ar";

const REPLI: Record<LangueUnite, string> = { fr: "éléments", en: "elements", ar: "عناصر" };

const ARABE = /[؀-ۿ]/;

/** Coupe le titre avant « : », « ( », « , », un tiret entre espaces ou « et » / « and ». */
const SEPARATEURS = /\s*[:(,،–—]|\s-\s|\s(?:et|and|&)\s/i;

/** Articles du début, retirés (« Les plages » → « plages »). */
const ARTICLES = /^(?:les|des|the)\s+/i;

/**
 * Mots trop vagues pour servir d'unité : « 69 divisions » ou « 1 200 données » ne disent rien de ce qu'on compte.
 * (« Divisions administratives » → « éléments ».)
 */
const MOTS_VAGUES = new Set([
  "divisions",
  "données",
  "donnees",
  "data",
  "statistiques",
  "statistics",
  "chiffres",
  "figures",
  "indicateurs",
  "indicators",
  "informations",
  "résultats",
  "results",
  "listes",
  "lists",
  "limites",
  "contours",
  "boundaries",
]);

/** Partie du titre avant le premier séparateur (« Mairies (APC) » → « Mairies »). */
export function titreCourt(titre: string): string {
  return titre.split(SEPARATEURS)[0].replace(/\s+/g, " ").trim();
}

export function devinerUnite(titre: string, langue: LangueUnite): string {
  const court = titreCourt(titre);
  // Arabe : premier mot du titre court, tel quel (pas de mise au singulier).
  if (langue === "ar" || ARABE.test(court)) return court.split(" ")[0] || REPLI.ar;

  const mots = court
    .replace(ARTICLES, "")
    .toLocaleLowerCase(langue)
    .split(" ")
    .filter(Boolean);
  if (mots.length === 0 || mots.length > 3) return REPLI[langue];
  // Mot composé : son premier élément (« stations-service » → « stations »).
  mots[0] = mots[0].split("-")[0];
  // Un nom au pluriel plausible finit par s ou x.
  if (!/[sx]$/.test(mots[0]) || MOTS_VAGUES.has(mots[0])) return REPLI[langue];
  return mots.join(" ");
}
