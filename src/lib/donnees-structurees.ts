import type { Donnee } from "./types";
import type { WilayaChiffres } from "./wilayas";

/**
 * Référencement : description courte des pages et données structurées schema.org (JSON-LD).
 * Le bloc `Dataset` de chaque fiche est ce que lit Google Dataset Search ; fonctions pures, testées.
 */

export const URL_SITE = "https://www.data-dz.com";
const LONGUEUR_DESCRIPTION = 160;
/** Google Dataset Search demande une description de 50 à 5 000 caractères. */
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 5000;
/** Rectangle englobant de l'Algérie (sud, ouest, nord, est), au format `GeoShape.box`. */
const BOITE_ALGERIE = "18.96 -8.67 37.09 11.98";

const TYPES_MIME: Record<string, string> = {
  csv: "text/csv",
  json: "application/json",
  geojson: "application/geo+json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  parquet: "application/vnd.apache.parquet",
};

/** Texte brut : sans Markdown ni liens, espaces regroupés. */
export function texteBrut(texte: string): string {
  return texte
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_#>|~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Description de la balise `<meta name="description">` : 160 caractères au plus, coupée entre deux mots. */
export function descriptionMeta(texte: string, longueur = LONGUEUR_DESCRIPTION): string {
  const brut = texteBrut(texte);
  if (brut.length <= longueur) return brut;
  const coupe = brut.slice(0, longueur - 1);
  const espace = coupe.lastIndexOf(" ");
  return `${(espace > longueur / 2 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.–-]+$/, "")}…`;
}

const entier = (valeur: unknown): number | null => {
  const nombre = typeof valeur === "string" && valeur.trim() !== "" ? Number(valeur) : valeur;
  return typeof nombre === "number" && Number.isInteger(nombre) ? nombre : null;
};

/** Période couverte (« 1981/2025 ») d'après les années écrites par la synchronisation, sinon `null`. */
export function periodeCouverte(infos: Record<string, unknown> | null | undefined): string | null {
  if (!infos) return null;
  const debut = entier(infos.premiere_annee_observee);
  const fin = entier(infos.derniere_annee_projetee) ?? entier(infos.derniere_annee_observee);
  if (debut === null) return null;
  return fin !== null && fin > debut ? `${debut}/${fin}` : String(debut);
}

/** Lien d'une licence : celui de la base, sinon la page SPDX du code (« CC-BY-4.0 », « ODbL-1.0 »…). */
export function urlLicence(donnee: Pick<Donnee, "licences" | "licence_code">): string | null {
  if (donnee.licences?.url) return donnee.licences.url;
  const code = donnee.licence_code?.trim();
  return code && /^[A-Za-z0-9.+-]+$/.test(code) ? `https://spdx.org/licenses/${code}.html` : null;
}

interface OptionsDataset {
  /** Titre et description dans la langue de la page. */
  titre: string;
  description: string;
  /** Phrase ajoutée si la description est trop courte pour Google (moins de 50 caractères). */
  complement: string;
  url: string;
  image?: string;
  langue: string;
}

/** Bloc schema.org `Dataset` d'une fiche (https://developers.google.com/search/docs/appearance/structured-data/dataset). */
export function jsonLdDataset(donnee: Donnee, options: OptionsDataset): Record<string, unknown> {
  let description = texteBrut(options.description);
  if (description.length < DESCRIPTION_MIN) {
    description = [description || options.titre, options.complement].filter(Boolean).join(" ").trim();
  }
  if (description.length > DESCRIPTION_MAX) description = descriptionMeta(description, DESCRIPTION_MAX);

  const source = donnee.sources;
  const createur = source?.nom
    ? { "@type": "Organization", name: source.nom, ...(source.url ? { url: source.url } : {}) }
    : undefined;
  const version = donnee.versions;
  const restreinte = Boolean(donnee.diffusion_restreinte);

  const distribution = restreinte
    ? []
    : (donnee.ressources ?? [])
        .flatMap((ressource) =>
          ressource.telechargements.map((telechargement) => ({
            "@type": "DataDownload",
            name: `${ressource.nom}.${telechargement.format}`,
            encodingFormat: TYPES_MIME[telechargement.format] ?? telechargement.format,
            contentUrl: telechargement.url,
          }))
        )
        .slice(0, 20);

  const colonnes = (version?.colonnes ?? []).map((colonne) => colonne.nom).filter(Boolean).slice(0, 30);
  const periode = periodeCouverte(donnee.infos_source);
  const licence = urlLicence(donnee);
  const motsCles = (donnee.mots_cles ?? []).filter(Boolean);

  const bloc: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: options.titre,
    description,
    url: options.url,
    identifier: donnee.slug,
    inLanguage: options.langue,
    isAccessibleForFree: true,
    spatialCoverage: { "@type": "Place", name: "Algeria", geo: { "@type": "GeoShape", box: BOITE_ALGERIE } },
    includedInDataCatalog: { "@type": "DataCatalog", name: "data-dz", url: URL_SITE },
    publisher: { "@type": "Organization", name: "data-dz", url: URL_SITE },
  };
  if (motsCles.length > 0) bloc.keywords = motsCles;
  if (licence) bloc.license = licence;
  if (createur) bloc.creator = createur;
  if (donnee.url_source) bloc.sameAs = donnee.url_source;
  if (options.image) bloc.image = options.image;
  if (periode) bloc.temporalCoverage = periode;
  if (version?.numero) bloc.version = version.numero;
  if (version?.publie_le) bloc.datePublished = version.publie_le;
  if (donnee.mis_a_jour_le) bloc.dateModified = donnee.mis_a_jour_le;
  if (colonnes.length > 0) bloc.variableMeasured = colonnes;
  if (distribution.length > 0) bloc.distribution = distribution;
  return bloc;
}

/** Bloc schema.org de la page d'une wilaya : une division administrative de l'Algérie. */
export function jsonLdWilaya(wilaya: WilayaChiffres, options: { nom: string; url: string; description: string }) {
  const nomsAlternatifs = [wilaya.nom.fr, wilaya.nom.ar].filter((nom): nom is string => Boolean(nom) && nom !== options.nom);
  return {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: options.nom,
    ...(nomsAlternatifs.length > 0 ? { alternateName: nomsAlternatifs } : {}),
    identifier: wilaya.code,
    description: options.description,
    url: options.url,
    containedInPlace: { "@type": "Country", name: "Algeria", identifier: "DZ" },
  };
}
