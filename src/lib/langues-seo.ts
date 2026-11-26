import { URL_SITE } from "./donnees-structurees";

/**
 * Référencement des trois langues : chaque page existe en `?lng=fr`, `?lng=en` et `?lng=ar` (paramètre déjà lu
 * par i18next et par le script de `index.html`), l'adresse sans paramètre suit la langue de l'appareil (`x-default`).
 * Les balises `hreflang` et le sitemap relient ces versions. Fonctions pures, testées.
 */

export const LANGUES_SEO = ["fr", "en", "ar"] as const;
export type LangueSeo = (typeof LANGUES_SEO)[number];
export const PARAMETRE_LANGUE = "lng";

const LOCALES_OPEN_GRAPH: Record<LangueSeo, string> = { fr: "fr_FR", en: "en_US", ar: "ar_DZ" };

const estLangue = (valeur: string | null | undefined): valeur is LangueSeo =>
  (LANGUES_SEO as readonly string[]).includes(valeur ?? "");

/** Langue imposée par l'adresse (`?lng=ar`), sinon `null`. */
export function langueDeLAdresse(recherche: string): LangueSeo | null {
  const valeur = new URLSearchParams(recherche).get(PARAMETRE_LANGUE)?.toLowerCase().slice(0, 2);
  return estLangue(valeur) ? valeur : null;
}

/** Adresse d'une page dans une langue (`null` : sans paramètre, la version `x-default`). */
export function urlEnLangue(chemin: string, langue: LangueSeo | null): string {
  const base = `${URL_SITE}${chemin || "/"}`;
  return langue ? `${base}?${PARAMETRE_LANGUE}=${langue}` : base;
}

/** Balises `<link rel="alternate" hreflang>` d'une page : les trois langues et `x-default`. */
export function alternativesLangues(chemin: string): { hreflang: string; href: string }[] {
  return [
    ...LANGUES_SEO.map((langue) => ({ hreflang: langue, href: urlEnLangue(chemin, langue) })),
    { hreflang: "x-default", href: urlEnLangue(chemin, null) },
  ];
}

/**
 * Adresse canonique : celle de la langue affichée si l'adresse en impose une (chaque version est sa propre
 * canonique, comme le demande Google avec hreflang), sinon l'adresse sans paramètre.
 */
export function urlCanonique(chemin: string, recherche: string, langueAffichee: string): string {
  const imposee = langueDeLAdresse(recherche);
  if (!imposee) return urlEnLangue(chemin, null);
  return urlEnLangue(chemin, estLangue(langueAffichee) ? langueAffichee : imposee);
}

export const localeOpenGraph = (langue: string) => (estLangue(langue) ? LOCALES_OPEN_GRAPH[langue] : LOCALES_OPEN_GRAPH.fr);

/**
 * Adresse à garder dans la barre quand on change de langue : si elle impose une langue (`?lng=fr`), le paramètre
 * suit le nouveau choix (sinon un rechargement reviendrait à l'ancienne langue). `null` : rien à changer.
 */
export function rechercheApresChangement(recherche: string, langue: string): string | null {
  const parametres = new URLSearchParams(recherche);
  const actuelle = parametres.get(PARAMETRE_LANGUE);
  if (actuelle === null || actuelle === langue || !estLangue(langue)) return null;
  parametres.set(PARAMETRE_LANGUE, langue);
  return `?${parametres.toString()}`;
}
