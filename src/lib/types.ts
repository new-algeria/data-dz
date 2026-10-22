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

export interface Fichier {
  nom: string | null;
  format: string;
  cle_stockage: string;
  principal: boolean;
  taille_octets: number | null;
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
  versions: Pick<Version, "numero" | "nb_lignes" | "publie_le"> | null;
  mis_a_jour_le: string;
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
}
