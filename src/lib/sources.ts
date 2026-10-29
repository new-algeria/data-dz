import type { SourceApi } from "./admin-donnees";

/** Source par défaut des données proposées par la communauté. */
export const SOURCE_COMMUNAUTE = "communaute";

/** Nom comparé sans casse, accents, ponctuation ni espaces (même règle que l'API : « Banque Mondiale » = « banque-mondiale »). */
export const cleNomSource = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** Domaine d'une URL sans `www.` (`https://www.ons.dz/page` → `ons.dz`), `null` si l'URL est invalide. */
function domaine(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Source existante qui correspond à celle indiquée dans une proposition (texte libre) :
 * même nom (casse et accents ignorés), sinon même site. `null` si aucune ne correspond.
 */
export function sourceCorrespondante(sources: SourceApi[], nom: string | null, url: string | null): SourceApi | null {
  const cle = nom ? cleNomSource(nom) : "";
  if (cle) {
    const parNom = sources.find((source) => cleNomSource(source.nom) === cle || source.slug.replace(/-/g, "") === cle);
    if (parNom) return parNom;
  }
  const site = domaine(url);
  return site ? (sources.find((source) => domaine(source.url) === site) ?? null) : null;
}
