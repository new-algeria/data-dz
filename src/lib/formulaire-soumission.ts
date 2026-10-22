import { FORMAT_SITE_WEB, normaliserSiteWeb } from "./profils";
import type { ChampsSoumission, Soumission } from "./soumissions";
import type { DonneeModifiable } from "./referentiels";
import type { TexteMultilingue } from "./types";

/** État du formulaire de proposition (chaînes de saisie, converties à l'envoi). */
export interface ValeursFormulaire {
  titreFr: string;
  titreEn: string;
  titreAr: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
  categorie: string;
  licence: string;
  sourceNom: string;
  sourceUrl: string;
  motsCles: string[];
  wilayas: string[];
  periodeDebut: string;
  periodeFin: string;
  message: string;
}

export const LONGUEUR_MAX_TITRE = 200;
export const LONGUEUR_MAX_DESCRIPTION = 5000;
export const LONGUEUR_MAX_SOURCE_NOM = 200;
export const LONGUEUR_MAX_MESSAGE = 2000;

export const valeursVides = (): ValeursFormulaire => ({
  titreFr: "",
  titreEn: "",
  titreAr: "",
  descriptionFr: "",
  descriptionEn: "",
  descriptionAr: "",
  categorie: "",
  licence: "",
  sourceNom: "",
  sourceUrl: "",
  motsCles: [],
  wilayas: [],
  periodeDebut: "",
  periodeFin: "",
  message: "",
});

/** Pré-remplit une mise à jour avec la fiche actuelle de la donnée. */
export const valeursDepuisDonnee = (donnee: DonneeModifiable): ValeursFormulaire => ({
  ...valeursVides(),
  titreFr: donnee.titre.fr ?? "",
  titreEn: donnee.titre.en ?? "",
  titreAr: donnee.titre.ar ?? "",
  descriptionFr: donnee.description?.fr ?? "",
  descriptionEn: donnee.description?.en ?? "",
  descriptionAr: donnee.description?.ar ?? "",
  categorie: donnee.categorie_slug ?? "",
  licence: donnee.licence_code ?? "",
  sourceUrl: donnee.url_source ?? "",
  motsCles: donnee.mots_cles ?? [],
  wilayas: donnee.wilayas ?? [],
});

export const valeursDepuisSoumission = (s: Soumission): ValeursFormulaire => ({
  titreFr: s.titre.fr ?? "",
  titreEn: s.titre.en ?? "",
  titreAr: s.titre.ar ?? "",
  descriptionFr: s.description?.fr ?? "",
  descriptionEn: s.description?.en ?? "",
  descriptionAr: s.description?.ar ?? "",
  categorie: s.categorie_slug ?? "",
  licence: s.licence_code ?? "",
  sourceNom: s.source_nom ?? "",
  sourceUrl: s.source_url ?? "",
  motsCles: s.mots_cles ?? [],
  wilayas: s.wilayas ?? [],
  periodeDebut: s.periode_debut ?? "",
  periodeFin: s.periode_fin ?? "",
  message: s.message ?? "",
});

/** Objet multilingue sans les langues vides ; null s'il est entièrement vide. */
function multilingue(fr: string, en: string, ar: string): TexteMultilingue | null {
  const texte: TexteMultilingue = {};
  if (fr.trim()) texte.fr = fr.trim();
  if (en.trim()) texte.en = en.trim();
  if (ar.trim()) texte.ar = ar.trim();
  return Object.keys(texte).length ? texte : null;
}

export function versChamps(v: ValeursFormulaire): ChampsSoumission {
  return {
    titre: multilingue(v.titreFr, v.titreEn, v.titreAr) ?? {},
    description: multilingue(v.descriptionFr, v.descriptionEn, v.descriptionAr),
    categorie_slug: v.categorie || null,
    licence_code: v.licence || null,
    source_nom: v.sourceNom.trim() || null,
    source_url: normaliserSiteWeb(v.sourceUrl),
    mots_cles: v.motsCles,
    wilayas: v.wilayas,
    periode_debut: v.periodeDebut || null,
    periode_fin: v.periodeFin || null,
    message: v.message.trim() || null,
  };
}

/** Première erreur de saisie (clé i18n `erreurs.*`), ou null si le formulaire est valide. */
export function validerValeurs(v: ValeursFormulaire): string | null {
  if (!v.titreFr.trim()) return "erreurs.titreRequis";
  if ([v.titreFr, v.titreEn, v.titreAr].some((titre) => titre.trim().length > LONGUEUR_MAX_TITRE)) return "erreurs.titreTropLong";
  const url = normaliserSiteWeb(v.sourceUrl);
  if (url && !FORMAT_SITE_WEB.test(url)) return "erreurs.sourceUrlInvalide";
  if (v.sourceNom.trim().length > LONGUEUR_MAX_SOURCE_NOM) return "erreurs.sourceNomTropLong";
  if (v.periodeDebut && v.periodeFin && v.periodeFin < v.periodeDebut) return "erreurs.periodeInvalide";
  if (v.message.trim().length > LONGUEUR_MAX_MESSAGE) return "erreurs.messageTropLong";
  return null;
}
