/** Texte multilingue stocké en jsonb : `fr` est toujours présent, `en` et `ar` pas toujours. */
export type TexteMultilingue = Partial<Record<"fr" | "en" | "ar", string>>;

export interface Categorie {
  slug: string;
  nom: TexteMultilingue;
  icone: string | null;
  ordre: number;
}

export interface Source {
  slug: string;
  nom: string;
  url: string | null;
  verifiee?: boolean;
}

export interface Licence {
  code: string;
  nom: string;
  url: string | null;
  usage_commercial?: boolean;
  attribution_requise?: boolean;
  partage_identique?: boolean;
}

export interface Colonne {
  nom: string;
  type?: string;
  description?: string;
}

/** Fichier d'une version. Les URL passent par l'API : la clé de stockage R2 n'est jamais exposée. */
export interface Fichier {
  /** Identifiant stable dans la fiche : `<nom>.<format>`. */
  id: string;
  nom: string | null;
  format: string;
  principal: boolean;
  taille_octets: number | null;
  /** Lecture dans le navigateur (carte, aperçu). */
  url: string;
  /** Téléchargement (fichier joint). */
  url_telechargement: string;
}

export type FormatTelechargement = "csv" | "xlsx" | "json" | "geojson" | "parquet";

/** Un fichier de la donnée et tous les formats dans lesquels l'API peut le livrer. */
export interface Ressource {
  nom: string;
  principal: boolean;
  fichiers: { format: string; taille_octets: number | null; url: string }[];
  telechargements: { format: FormatTelechargement; natif: boolean; url: string }[];
}

export interface Version {
  numero: string;
  notes?: string | null;
  nb_lignes: number | null;
  colonnes: Colonne[] | null;
  apercu: unknown;
  publie_le: string | null;
  fichiers: Fichier[] | null;
}

/** Compteurs de la communauté, tenus à jour par les triggers de la base. */
export interface CompteursDonnee {
  id: string;
  score: number;
  nb_votes_pour: number;
  nb_votes_contre: number;
  nb_favoris: number;
  nb_commentaires: number;
}

/** Ligne du catalogue (page d'accueil). */
export interface ResumeDonnee extends CompteursDonnee {
  slug: string;
  titre: TexteMultilingue;
  description: TexteMultilingue | null;
  categorie_slug: string | null;
  licence_code: string | null;
  mots_cles: string[] | null;
  sources: Source | null;
  /** `colonnes` : séries temporelles et coordonnées (cartes du catalogue) ; absentes des favoris. */
  versions: (Pick<Version, "numero" | "nb_lignes" | "publie_le"> & { colonnes?: Colonne[] | null }) | null;
  /** Chiffres écrits par la synchronisation (nombre d'indicateurs, années…). */
  infos_source?: Record<string, unknown> | null;
  /** Fichiers et liens de téléchargement (comme la fiche), pour le bouton « Télécharger » des cartes. */
  ressources?: Ressource[];
  mis_a_jour_le: string;
  /** Première publication dans le catalogue (et création) : une donnée de moins de 4 jours est « Récente ». */
  publie_le?: string | null;
  cree_le?: string;
  /** Illustration choisie par un administrateur (sinon image par défaut du slug). */
  illustration_url?: string | null;
  /** Fichiers non redistribuables par data-dz : pas de téléchargement ni d'API, lien vers le paquet de la source. */
  diffusion_restreinte?: boolean;
  /** Où obtenir une donnée restreinte (paquet npm de la source). */
  lien_paquet?: string | null;
}

/** Fiche complète d'une donnée. */
export interface Donnee extends CompteursDonnee {
  slug: string;
  titre: TexteMultilingue;
  description: TexteMultilingue | null;
  readme: string | null;
  categorie_slug: string | null;
  licence_code: string | null;
  licence_details: string | null;
  url_source: string | null;
  mots_cles: string[] | null;
  infos_source: Record<string, unknown> | null;
  categories: Pick<Categorie, "slug" | "nom" | "icone"> | null;
  sources: Source | null;
  licences: Licence | null;
  versions: Version | null;
  illustration_url?: string | null;
  /** Dernière mise à jour : sert de version à l'image d'aperçu (cache des réseaux sociaux). */
  mis_a_jour_le?: string;
  /** Codes des wilayas couvertes (« 16 », « 31 »…), renvoyés par l'API. */
  wilayas?: string[] | null;
  /** Fichiers regroupés par nom, avec leurs formats de téléchargement (API). */
  ressources: Ressource[];
  diffusion_restreinte?: boolean;
  lien_paquet?: string | null;
}
