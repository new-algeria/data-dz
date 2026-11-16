import photosParWilaya from "./photos-wilayas.json";

/**
 * Photos des wilayas : fichiers Wikimedia Commons choisis sur Wikidata (bannière et image principale de la wilaya
 * et de son chef-lieu, `scripts/photos-wilayas.mjs`). Les images et leurs crédits (auteur, licence) sont lus
 * dans le navigateur ; sans réponse de Commons, la photo s'affiche quand même avec un lien vers sa page.
 */

export interface PhotoWilaya {
  fichier: string;
  vignette: string;
  /** Page Commons de la photo (auteur, licence complète). */
  page: string;
  largeur: number | null;
  hauteur: number | null;
  auteur: string | null;
  licence: string | null;
  urlLicence: string | null;
}

const COMMONS = "https://commons.wikimedia.org";
export const LARGEUR_VIGNETTE = 1280;

const nomCommons = (fichier: string) => fichier.replace(/ /g, "_");

/** Fichiers Commons retenus pour une wilaya (vide si aucun). */
export const fichiersWilaya = (code: string): string[] =>
  (photosParWilaya as Record<string, { photos?: string[] }>)[code]?.photos ?? [];

export const urlVignette = (fichier: string, largeur = LARGEUR_VIGNETTE) =>
  `${COMMONS}/wiki/Special:FilePath/${encodeURIComponent(nomCommons(fichier))}?width=${largeur}`;

export const urlPageFichier = (fichier: string) => `${COMMONS}/wiki/File:${encodeURIComponent(nomCommons(fichier))}`;

/** Texte lisible d'un champ HTML de Commons (auteur souvent sous forme de lien). */
export function texteSansHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  const texte = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return texte ? (texte.length > 80 ? `${texte.slice(0, 77)}…` : texte) : null;
}

/** Photo sans crédits détaillés (Commons injoignable) : l'image et le lien vers sa page suffisent à l'attribution. */
export const photoSimple = (fichier: string): PhotoWilaya => ({
  fichier,
  vignette: urlVignette(fichier),
  page: urlPageFichier(fichier),
  largeur: null,
  hauteur: null,
  auteur: null,
  licence: null,
  urlLicence: null,
});

interface ReponseCommons {
  query?: {
    normalized?: { from: string; to: string }[];
    pages?: {
      title: string;
      missing?: boolean;
      imageinfo?: {
        thumburl?: string;
        thumbwidth?: number;
        thumbheight?: number;
        descriptionurl?: string;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }[];
  };
}

/** Associe la réponse de l'API Commons (formatversion=2) aux fichiers demandés, dans leur ordre ; ignore les absents. */
export function lirePhotosCommons(reponse: ReponseCommons, fichiers: string[]): PhotoWilaya[] {
  const titres = new Map((reponse.query?.normalized ?? []).map((n) => [n.from, n.to]));
  const pages = new Map((reponse.query?.pages ?? []).map((page) => [page.title, page]));
  return fichiers.flatMap((fichier) => {
    const demande = `File:${fichier}`;
    const page = pages.get(titres.get(demande) ?? demande);
    if (!page || page.missing) return [];
    const info = page.imageinfo?.[0];
    if (!info) return [photoSimple(fichier)];
    const meta = info.extmetadata ?? {};
    return [
      {
        fichier,
        vignette: info.thumburl ?? urlVignette(fichier),
        page: info.descriptionurl ?? urlPageFichier(fichier),
        largeur: info.thumbwidth ?? null,
        hauteur: info.thumbheight ?? null,
        auteur: texteSansHtml(meta.Artist?.value),
        licence: texteSansHtml(meta.LicenseShortName?.value),
        urlLicence: meta.LicenseUrl?.value?.startsWith("http") ? meta.LicenseUrl.value : null,
      },
    ];
  });
}

/** Photos d'une wilaya avec leurs crédits. Repli : les photos sans crédits détaillés. */
export async function chargerPhotosWilaya(code: string): Promise<PhotoWilaya[]> {
  const fichiers = fichiersWilaya(code);
  if (fichiers.length === 0) return [];
  const parametres = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(LARGEUR_VIGNETTE),
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
    titles: fichiers.map((fichier) => `File:${fichier}`).join("|"),
  });
  try {
    const reponse = await fetch(`${COMMONS}/w/api.php?${parametres}`);
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const photos = lirePhotosCommons((await reponse.json()) as ReponseCommons, fichiers);
    return photos.length > 0 ? photos : fichiers.map(photoSimple);
  } catch {
    return fichiers.map(photoSimple);
  }
}
