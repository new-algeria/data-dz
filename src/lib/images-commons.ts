/**
 * Propositions d'illustrations pour une donnée (dialogue admin) : photos de Wikimedia Commons **sans obligation
 * d'attribution** (CC0 ou domaine public), cherchées à partir du titre. Aucune clé : l'API de Commons accepte les
 * appels du navigateur (`origin=*`) et ses images sont servies avec CORS, ce qui permet de les recadrer comme un
 * fichier importé (`preparerIllustration()`).
 */

const COMMONS = "https://commons.wikimedia.org";
const AGENT = "data-dz/1.0 (https://www.data-dz.com; propositions d'illustrations)";

/** Filtre de recherche Commons : licence CC0 (P275 = Q6938433) ou statut « domaine public » (P6216 = Q19652). */
export const FILTRE_LIBRE = "haswbstatement:P275=Q6938433|P6216=Q19652";
/** Largeur de l'image chargée pour l'illustration (taille standard des vignettes Commons). */
export const LARGEUR_IMAGE = 1280;
/** Largeur des vignettes affichées dans la grille de choix. */
export const LARGEUR_VIGNETTE = 330;
export const NB_PROPOSITIONS = 9;

export interface ImageCommons {
  titre: string;
  /** Vignette pour la grille de choix. */
  vignette: string;
  /** Image (au plus 1280 px de large) chargée à la sélection. */
  image: string;
  page: string;
  largeur: number;
  hauteur: number;
}

interface PageCommons {
  title?: string;
  index?: number;
  imageinfo?: {
    width?: number;
    height?: number;
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
  }[];
}

export interface ReponseRecherche {
  query?: { pages?: PageCommons[] };
  continue?: { gsroffset?: number };
}

// Mentions du pays retirées du titre : elles réduisent trop la recherche (le titre complet est rarement illustré).
const MOTIF_PAYS = /\b(en|d'|de l'|du|of|in)\s*alg[ée]rie\b|\b(in|of)\s+algeria\b|\balg[ée]rie(nne|n|s)?\b|\balgeria(n|ns)?\b/gi;
const MOTS_VIDES = new Set(["de", "des", "du", "la", "le", "les", "et", "en", "d", "l", "the", "and", "of", "in", "by", "per", "par"]);

/**
 * Termes de recherche tirés du titre : le titre anglais d'abord (Commons est surtout décrit en anglais), sinon le
 * français, sans mention du pays, sans parenthèses ni ponctuation, 5 mots au plus.
 */
export function termesRecherche(titre: { fr?: string; en?: string } | null | undefined): string {
  const source = (titre?.en?.trim() || titre?.fr?.trim() || "").split(/\s[:–—-]\s|[:(]/)[0];
  const mots = source
    .replace(MOTIF_PAYS, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .map((mot) => mot.replace(/^['-]+|['-]+$/g, ""))
    .filter((mot) => mot && !MOTS_VIDES.has(mot.toLowerCase()));
  return mots.slice(0, 5).join(" ");
}

/** Requête Commons : fichiers images libres (CC0 ou domaine public) qui correspondent aux termes. */
export function urlRecherche(termes: string, decalage = 0, limite = 40): string {
  const parametres = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${termes} ${FILTRE_LIBRE} filetype:bitmap`,
    gsrlimit: String(limite),
    gsroffset: String(decalage),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(LARGEUR_IMAGE),
    iiextmetadatafilter: "License|AttributionRequired|Restrictions",
  });
  return `${COMMONS}/w/api.php?${parametres}`;
}

const valeur = (meta: Record<string, { value?: string } | undefined> | undefined, cle: string) => meta?.[cle]?.value?.trim() ?? "";

/**
 * Image vraiment libre : licence CC0 ou domaine public, aucune attribution requise et aucune restriction
 * (droit à l'image d'une personne, marque déposée…). Double vérification du filtre de la recherche.
 */
export function estLibre(meta: Record<string, { value?: string } | undefined> | undefined): boolean {
  const licence = valeur(meta, "License").toLowerCase();
  const licenceLibre = licence === "cc0" || licence === "pd" || licence.startsWith("pd-") || licence.startsWith("cc0");
  return licenceLibre && valeur(meta, "AttributionRequired") === "false" && valeur(meta, "Restrictions") === "";
}

/** Vignette plus petite tirée de l'URL à 1280 px (`/1280px-` → `/330px-`) ; l'original sinon. */
export function urlVignetteDepuis(image: string): string {
  return image.replace(`/${LARGEUR_IMAGE}px-`, `/${LARGEUR_VIGNETTE}px-`);
}

/**
 * Résultats utilisables pour une illustration 5/3 : libres, en JPEG ou PNG, au moins 800 px de large et plutôt
 * horizontaux (rapport largeur / hauteur ≥ 1,1), dans l'ordre de pertinence de Commons.
 */
export function lireResultats(reponse: ReponseRecherche): ImageCommons[] {
  const pages = [...(reponse.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const images: ImageCommons[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const largeur = info?.width ?? 0;
    const hauteur = info?.height ?? 0;
    const image = info?.thumburl || info?.url;
    if (!info || !page.title || !image || !hauteur) continue;
    if (info.mime && !["image/jpeg", "image/png", "image/webp"].includes(info.mime)) continue;
    if (largeur < 800 || largeur / hauteur < 1.1 || !estLibre(info.extmetadata)) continue;
    images.push({
      titre: page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
      vignette: urlVignetteDepuis(image),
      image,
      page: info.descriptionurl ?? `${COMMONS}/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      largeur,
      hauteur,
    });
  }
  return images;
}

export interface Propositions {
  images: ImageCommons[];
  /** Décalage pour « Autres images », ou null s'il n'y a plus de résultat. */
  suite: number | null;
}

/** Un lot de propositions libres (40 résultats Commons filtrés) pour des termes donnés. */
export async function chercherImagesLibres(termes: string, decalage = 0): Promise<Propositions> {
  if (!termes.trim()) return { images: [], suite: null };
  // Wikimedia demande aux applications de s'identifier ; l'en-tête est autorisé par son CORS.
  const reponse = await fetch(urlRecherche(termes.trim(), decalage), { headers: { "Api-User-Agent": AGENT } });
  if (!reponse.ok) throw new Error(`Commons : HTTP ${reponse.status}`);
  const corps = (await reponse.json()) as ReponseRecherche;
  return { images: lireResultats(corps), suite: corps.continue?.gsroffset ?? null };
}

/** Termes de repli quand la recherche complète ne trouve rien : les 2 premiers mots, puis le premier. */
export function termesDeRepli(termes: string): string[] {
  const mots = termes.trim().split(/\s+/).filter(Boolean);
  const essais = [mots.join(" "), mots.slice(0, 2).join(" "), mots.slice(0, 1).join(" ")];
  return [...new Set(essais.filter(Boolean))];
}

/** Première recherche qui trouve des images : termes complets, puis de plus en plus courts. */
export async function chercherAvecRepli(termes: string): Promise<Propositions & { termes: string }> {
  for (const essai of termesDeRepli(termes)) {
    const resultat = await chercherImagesLibres(essai);
    if (resultat.images.length > 0) return { ...resultat, termes: essai };
  }
  return { images: [], suite: null, termes: termes.trim() };
}

/** Télécharge l'image choisie (CORS ouvert sur upload.wikimedia.org) pour la recadrer comme un fichier importé. */
export async function telechargerImage(image: ImageCommons): Promise<Blob> {
  const reponse = await fetch(image.image, { mode: "cors" });
  if (!reponse.ok) throw new Error(`Image : HTTP ${reponse.status}`);
  return reponse.blob();
}
