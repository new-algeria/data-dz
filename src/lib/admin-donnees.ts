import { appelerApi } from "./api";
import type { TexteMultilingue } from "./types";

/**
 * Gestion des données par les administrateurs : tout passe par l'API (`/v1/admin`), qui vérifie le rôle
 * avec la session Supabase jointe à chaque appel. Clés React Query : `["admin", "donnees", …]`.
 */

export const STATUTS_DONNEE = ["publie", "brouillon", "archive"] as const;
export type StatutDonnee = (typeof STATUTS_DONNEE)[number] | "en_revue";

export interface DonneeAdmin {
  id: string;
  slug: string;
  titre: TexteMultilingue;
  description: TexteMultilingue | null;
  readme: string | null;
  statut: StatutDonnee;
  categorie_slug: string | null;
  licence_code: string | null;
  licence_details: string | null;
  url_source: string | null;
  mots_cles: string[] | null;
  illustration_url: string | null;
  mis_a_jour_le: string;
  sources: { slug: string; nom: string; type: string } | null;
  versions: {
    numero: string;
    nb_lignes: number | null;
    fichiers: { nom: string | null; format: string; principal: boolean; taille_octets: number | null }[] | null;
  } | null;
}

export interface ChampsDonnee {
  titre: TexteMultilingue & { fr: string };
  description?: TexteMultilingue | null;
  readme?: string | null;
  categorie_slug?: string | null;
  source_slug?: string;
  licence_code?: string | null;
  licence_details?: string | null;
  url_source?: string | null;
  mots_cles?: string[];
  statut?: StatutDonnee;
}

export interface SourceApi {
  slug: string;
  nom: string;
  type: string;
  url?: string | null;
}

export interface LicenceApi {
  code: string;
  nom: string;
  /** Réutilisation commerciale permise : « Libre d'utilisation » sur les cartes du catalogue. */
  usage_commercial?: boolean;
}

const json = (corps: unknown): RequestInit => ({
  body: JSON.stringify(corps),
  headers: { "Content-Type": "application/json" },
});

export async function chargerDonneesAdmin(terme: string, statut: StatutDonnee | null): Promise<DonneeAdmin[]> {
  const params = new URLSearchParams();
  if (terme) params.set("q", terme);
  if (statut) params.set("statut", statut);
  return (await appelerApi<{ data: DonneeAdmin[] }>(`/v1/admin/datasets?${params}`, { authentifie: true })).data;
}

/** Sources sans le cache CDN d'une heure de `/v1/sources` : une source créée apparaît tout de suite. */
export const chargerSourcesAdmin = async () => (await appelerApi<{ data: SourceApi[] }>("/v1/admin/sources", { authentifie: true })).data;

export const creerSource = (nom: string, url: string | null) =>
  appelerApi<SourceApi>("/v1/admin/sources", { method: "POST", authentifie: true, ...json({ nom, url }) });
export const chargerLicencesApi = async () => (await appelerApi<{ data: LicenceApi[] }>("/v1/licences")).data;

export const creerDonnee = (slug: string, champs: ChampsDonnee) =>
  appelerApi<DonneeAdmin>("/v1/admin/datasets", { method: "POST", authentifie: true, ...json({ slug, ...champs }) });

export const modifierDonnee = (slug: string, champs: Partial<ChampsDonnee>) =>
  appelerApi<DonneeAdmin>(`/v1/admin/datasets/${slug}`, { method: "PATCH", authentifie: true, ...json(champs) });

export interface DisponibiliteSlug {
  slug: string;
  disponible: boolean;
  /** Donnée qui porte cet identifiant, ou qui l'a porté (`ancien_identifiant`). */
  utilise_par: string | null;
  ancien_identifiant: boolean;
}

export const verifierSlug = (slug: string) => appelerApi<DisponibiliteSlug>(`/v1/admin/slugs/${slug}`, { authentifie: true });

/**
 * Change l'identifiant : l'ancien redirige vers le nouveau (`redirection: false` tant que la migration
 * 20261029000010 manque). `illustrationActuelle` : image par défaut affichée, gardée telle quelle.
 */
export const renommerDonnee = (ancien: string, nouveau: string, illustrationActuelle?: string) =>
  appelerApi<{ donnee: DonneeAdmin; redirection: boolean }>(`/v1/admin/datasets/${ancien}/rename`, {
    method: "POST",
    authentifie: true,
    ...json({ slug: nouveau, ...(illustrationActuelle ? { illustration_actuelle: illustrationActuelle } : {}) }),
  });

export const supprimerDonnee = (slug: string) =>
  appelerApi<void>(`/v1/admin/datasets/${slug}?files=true`, { method: "DELETE", authentifie: true });

export async function envoyerIllustration(slug: string, image: Blob): Promise<string> {
  const formulaire = new FormData();
  formulaire.append("image", image, `illustration.${image.type === "image/webp" ? "webp" : "jpg"}`);
  const { illustration_url } = await appelerApi<{ illustration_url: string }>(`/v1/admin/datasets/${slug}/illustration`, {
    method: "POST",
    authentifie: true,
    body: formulaire,
  });
  return illustration_url;
}

export const retirerIllustration = (slug: string) =>
  appelerApi<void>(`/v1/admin/datasets/${slug}/illustration`, { method: "DELETE", authentifie: true });

// ---------------------------------------------------------------- Fichiers

export type FormatEnvoi = "json" | "geojson" | "csv";
export const TAILLE_MAX_FICHIER = 100 * 1024 * 1024;

export function formatDuFichier(fichier: File): FormatEnvoi | null {
  const extension = fichier.name.split(".").pop()?.toLowerCase();
  return extension === "json" || extension === "geojson" || extension === "csv" ? extension : null;
}

/** Nom logique tiré du nom de fichier (`Pharmacies 2026.geojson` → `pharmacies-2026`). */
export function nomLogique(fichier: File): string {
  return (
    fichier.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "donnees"
  );
}

/**
 * Publie une nouvelle version : chaque fichier est envoyé directement à R2 par une URL signée,
 * puis l'API relit les fichiers et crée la version (lignes, colonnes, aperçu).
 */
export async function publierFichiers(
  slug: string,
  fichiers: { fichier: File; principal: boolean }[],
  infos: { numero?: string; notes?: string },
  progression?: (envoyes: number, total: number) => void
) {
  const envoyes: { cle: string; nom: string; format: FormatEnvoi; principal: boolean }[] = [];
  for (const [indice, { fichier, principal }] of fichiers.entries()) {
    const format = formatDuFichier(fichier);
    if (!format) throw new Error(`Format non pris en charge : ${fichier.name}`);
    const nom = nomLogique(fichier);
    const envoi = await appelerApi<{ cle: string; url: string; content_type: string }>(`/v1/admin/datasets/${slug}/uploads`, {
      method: "POST",
      authentifie: true,
      ...json({ nom, format }),
    });
    const reponse = await fetch(envoi.url, { method: "PUT", body: fichier, headers: { "Content-Type": envoi.content_type } });
    if (!reponse.ok) throw new Error(`Envoi refusé par le stockage (${reponse.status}) : ${fichier.name}`);
    envoyes.push({ cle: envoi.cle, nom, format, principal });
    progression?.(indice + 1, fichiers.length);
  }
  return appelerApi<{ numero: string; nb_lignes: number }>(`/v1/admin/datasets/${slug}/versions`, {
    method: "POST",
    authentifie: true,
    ...json({ numero: infos.numero || undefined, notes: infos.notes || undefined, fichiers: envoyes }),
  });
}

// ---------------------------------------------------------------- Illustration

/**
 * Recadre l'image au format des illustrations (1200 × 720, comme le pack d'origine) et la convertit en WebP
 * (JPEG si le navigateur ne sait pas encoder le WebP). Résultat léger, homogène avec les autres illustrations.
 */
export async function preparerIllustration(fichier: File): Promise<Blob> {
  const url = URL.createObjectURL(fichier);
  try {
    const image = await new Promise<HTMLImageElement>((resoudre, rejeter) => {
      const element = new Image();
      element.onload = () => resoudre(element);
      element.onerror = () => rejeter(new Error("Image illisible"));
      element.src = url;
    });
    const largeur = 1200;
    const hauteur = 720;
    const canevas = document.createElement("canvas");
    canevas.width = largeur;
    canevas.height = hauteur;
    const contexte = canevas.getContext("2d");
    if (!contexte) throw new Error("Canvas indisponible");
    const echelle = Math.max(largeur / image.naturalWidth, hauteur / image.naturalHeight);
    const l = image.naturalWidth * echelle;
    const h = image.naturalHeight * echelle;
    contexte.drawImage(image, (largeur - l) / 2, (hauteur - h) / 2, l, h);
    const enBlob = (type: string, qualite: number) =>
      new Promise<Blob | null>((resoudre) => canevas.toBlob(resoudre, type, qualite));
    const webp = await enBlob("image/webp", 0.82);
    if (webp?.type === "image/webp") return webp;
    const jpeg = await enBlob("image/jpeg", 0.85);
    if (!jpeg) throw new Error("Conversion impossible");
    return jpeg;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------- Propositions

export interface MiseEnLigne {
  slug: string;
  creee: boolean;
  fichiers_ignores: string[];
}

/**
 * Met en ligne une proposition acceptée : l'API crée la donnée (avec la source choisie) ou sa nouvelle version,
 * puis marque la proposition publiée.
 */
export const mettreEnLigneProposition = (id: string, sourceSlug?: string) =>
  appelerApi<MiseEnLigne>(`/v1/admin/submissions/${id}/publish`, {
    method: "POST",
    authentifie: true,
    ...json(sourceSlug ? { source_slug: sourceSlug } : {}),
  });
