import type { ResumeDonnee } from "./types";

/**
 * Recherche de l'en-tête : filtre le catalogue déjà chargé, sans appel à l'API, pendant la frappe.
 * Chaque mot doit apparaître (début de mot) dans le titre (toutes langues), les mots-clés, la source ou l'identifiant.
 * Casse et accents ignorés. Les titres qui commencent par la recherche passent devant.
 */

const normaliser = (texte: string) =>
  texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Mots du texte (lettres, signes arabes et chiffres), normalisés. */
const motsDe = (texte: string): string[] => normaliser(texte).match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];

export function rechercherDonnees(liste: ResumeDonnee[], terme: string, langue: string, max = 6): ResumeDonnee[] {
  const recherche = motsDe(terme);
  if (recherche.length === 0) return [];
  const resultats: { donnee: ResumeDonnee; rang: number }[] = [];
  for (const donnee of liste) {
    const titreAffiche = normaliser(donnee.titre?.[langue as "fr"] ?? donnee.titre?.fr ?? "");
    const mots = new Set([
      ...Object.values(donnee.titre ?? {}).flatMap((titre) => motsDe(titre ?? "")),
      ...(donnee.mots_cles ?? []).flatMap(motsDe),
      ...motsDe(donnee.sources?.nom ?? ""),
      ...motsDe(donnee.slug.replace(/-/g, " ")),
    ]);
    const trouve = recherche.every((mot) => [...mots].some((candidat) => candidat.startsWith(mot)));
    if (!trouve) continue;
    // 0 : le titre affiché commence par la recherche ; 1 : un mot du titre ; 2 : ailleurs (mots-clés, source).
    const rang = titreAffiche.startsWith(recherche.join(" ")) ? 0 : recherche.every((mot) => motsDe(titreAffiche).some((m) => m.startsWith(mot))) ? 1 : 2;
    resultats.push({ donnee, rang });
  }
  return resultats
    .sort((a, b) => a.rang - b.rang || normaliser(a.donnee.titre?.fr ?? "").localeCompare(normaliser(b.donnee.titre?.fr ?? "")))
    .slice(0, max)
    .map((resultat) => resultat.donnee);
}

/** Wilaya telle que la liste des noms la donne (`chargerWilayas()`). */
export interface WilayaRecherche {
  code: string;
  nom: { fr?: string; en?: string; ar?: string };
}

/**
 * Wilayas pour la recherche de l'en-tête : numéro (« 16 », « 9 ») ou début des mots du nom, dans toutes les langues,
 * sans casse ni accents (« bordj bou », « bejaia », « وهران »). Les noms qui commencent par la recherche passent devant.
 */
export function rechercherWilayas(wilayas: WilayaRecherche[], terme: string, max = 3): WilayaRecherche[] {
  const brut = terme.trim();
  if (!brut) return [];
  if (/^\d{1,2}$/.test(brut)) {
    const code = brut.padStart(2, "0");
    return wilayas.filter((wilaya) => wilaya.code === code && wilaya.nom.fr).slice(0, 1);
  }
  const recherche = motsDe(brut);
  if (recherche.length === 0) return [];
  const resultats: { wilaya: WilayaRecherche; rang: number }[] = [];
  for (const wilaya of wilayas) {
    if (!wilaya.nom.fr) continue;
    const noms = Object.values(wilaya.nom).filter((nom): nom is string => Boolean(nom));
    const mots = noms.flatMap(motsDe);
    if (!recherche.every((mot) => mots.some((candidat) => candidat.startsWith(mot)))) continue;
    const debut = noms.some((nom) => normaliser(nom).replace(/['’-]/g, " ").startsWith(recherche.join(" ")));
    resultats.push({ wilaya, rang: debut ? 0 : 1 });
  }
  return resultats
    .sort((a, b) => a.rang - b.rang || a.wilaya.code.localeCompare(b.wilaya.code))
    .slice(0, max)
    .map((resultat) => resultat.wilaya);
}
