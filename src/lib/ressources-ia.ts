/**
 * Ressources mondiales pour l'IA : jeux de données reconnus, hébergés par leurs auteurs, que data-dz présente
 * (page /ai-datasets et fin du catalogue) sans jamais les héberger. Les textes visibles (description, idée de projet,
 * unité du chiffre) sont dans i18n : `ressourcesIA.ressources.<id>.*`. Pour ajouter une ressource : une entrée ici,
 * ses textes en fr / en / ar, et son image libre de droits dans `public/ressources-ia/<id>.webp` (crédit ci-dessous).
 */
import type { ResumeDonnee } from "./types";

/** Domaines de la page, dans l'ordre d'affichage (santé en premier). */
export const DOMAINES_IA = [
  { code: "sante", icone: "🩺", categories: ["sante"] },
  { code: "langues", icone: "🗣️", categories: [] },
  { code: "climat", icone: "🌦️", categories: ["environnement"] },
  { code: "satellite", icone: "🛰️", categories: [] },
  { code: "economie", icone: "📈", categories: ["economie", "emploi"] },
  { code: "agriculture", icone: "🌾", categories: ["agriculture"] },
  { code: "mobilite", icone: "🚌", categories: ["transport"] },
  { code: "energie", icone: "⚡", categories: ["energie"] },
] as const;

export type DomaineIA = (typeof DOMAINES_IA)[number]["code"];
export type TypeDonneesIA = "images" | "images3d" | "audio" | "texte" | "signaux" | "tableaux" | "series" | "grilles" | "cartes";
/** libre : téléchargement direct ; inscription : compte gratuit ; controle : formation ou accord d'utilisation. */
export type AccesIA = "libre" | "inscription" | "controle";

export interface CreditImage {
  auteur: string;
  licence: string;
  /** Page Wikimedia Commons du fichier. */
  page: string;
}

export interface RessourceIA {
  id: string;
  nom: string;
  domaine: DomaineIA;
  /** Catégorie du catalogue où la ressource apparaît (filtre « catégorie »), null : seulement pour une recherche. */
  categorie: string | null;
  types: TypeDonneesIA[];
  /** Licence : code court affiché tel quel (« CC BY 4.0 ») ou clé en minuscules traduite (`ressourcesIA.licences.*`). */
  licence: string;
  /** Licence non commerciale, variable ou soumise à conditions : badge ambre. */
  licenceRestreinte?: boolean;
  acces: AccesIA;
  hebergeur: string;
  url: string;
  /** Chiffre de la carte : valeur affichée telle quelle, unité dans i18n (`…chiffre`). */
  chiffre?: string;
  credit: CreditImage;
  /** Mots de recherche en plus du nom et des textes (toutes langues). */
  motsCles: string[];
}

export const RESSOURCES_IA: RessourceIA[] = [
  {
    id: "medmnist", nom: "MedMNIST", domaine: "sante", categorie: "sante", types: ["images", "images3d"],
    licence: "CC BY 4.0", licenceRestreinte: true, acces: "libre", hebergeur: "MedMNIST (Zenodo)", url: "https://medmnist.com/", chiffre: "18",
    credit: { auteur: "ZEISS Microscopy", licence: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Mouse_tissue,_stained_histology_preparation_(23782972906).jpg" },
    motsCles: ["medical", "médical", "imagerie", "classification", "histologie", "radiographie", "طبي"],
  },
  {
    id: "chestxray14", nom: "NIH ChestX-ray14", domaine: "sante", categorie: "sante", types: ["images"],
    licence: "acces-libre", acces: "libre", hebergeur: "NIH Clinical Center", url: "https://nihcc.app.box.com/v/ChestXray-NIHCC", chiffre: "112 120",
    credit: { auteur: "Nevit Dilmen", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Chest_X-ray_1300275.JPG" },
    motsCles: ["radiographie", "radio", "poumon", "thorax", "x-ray", "chest", "lung", "أشعة"],
  },
  {
    id: "isic", nom: "ISIC Archive", domaine: "sante", categorie: "sante", types: ["images"],
    licence: "CC BY · CC BY-NC", licenceRestreinte: true, acces: "libre", hebergeur: "International Skin Imaging Collaboration", url: "https://www.isic-archive.com/",
    credit: { auteur: "Frank33", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Dermatoscope1.JPG" },
    motsCles: ["dermatologie", "peau", "melanome", "mélanome", "skin", "dermatology", "جلد"],
  },
  {
    id: "brats", nom: "BraTS", domaine: "sante", categorie: "sante", types: ["images3d"],
    licence: "conditions-challenge", licenceRestreinte: true, acces: "inscription", hebergeur: "Synapse (BraTS)", url: "https://www.synapse.org/brats",
    credit: { auteur: "Bobjgalindo", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:MRI_brain_tumor.jpg" },
    motsCles: ["irm", "mri", "cerveau", "brain", "tumeur", "tumor", "segmentation", "دماغ"],
  },
  {
    id: "physionet", nom: "PhysioNet (MIMIC-IV, ECG)", domaine: "sante", categorie: "sante", types: ["signaux", "tableaux"],
    licence: "selon-jeu", licenceRestreinte: true, acces: "controle", hebergeur: "MIT (PhysioNet)", url: "https://physionet.org/",
    credit: { auteur: "medipics1066", licence: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Normal_electrocardiogram.jpg" },
    motsCles: ["ecg", "eeg", "signal", "coeur", "cœur", "heart", "mimic", "réanimation", "intensive care", "قلب"],
  },
  {
    id: "uci-ml", nom: "UCI Machine Learning Repository", domaine: "sante", categorie: "sante", types: ["tableaux"],
    licence: "souvent-cc-by", acces: "libre", hebergeur: "University of California, Irvine", url: "https://archive.ics.uci.edu/",
    credit: { auteur: "Jacek Halicki", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2023_Stetoskop.jpg" },
    motsCles: ["diabete", "diabète", "cardiaque", "heart disease", "cancer", "tabulaire", "machine learning", "سكري"],
  },
  {
    id: "common-voice", nom: "Mozilla Common Voice", domaine: "langues", categorie: "culture-tourisme", types: ["audio", "texte"],
    licence: "CC0", acces: "libre", hebergeur: "Mozilla", url: "https://commonvoice.mozilla.org/", chiffre: "100+",
    credit: { auteur: "Will Fisher", licence: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Neumann_U87_Condenser_Microphone_-_Studio_A,_In_Your_Ear_Studios.jpg" },
    motsCles: ["voix", "audio", "parole", "speech", "kabyle", "tamazight", "amazigh", "arabe", "arabic", "reconnaissance vocale", "صوت", "أمازيغية"],
  },
  {
    id: "wikipedia", nom: "Wikipedia (ar, kab, fr)", domaine: "langues", categorie: "culture-tourisme", types: ["texte"],
    licence: "CC BY-SA", acces: "libre", hebergeur: "Wikimedia Foundation", url: "https://dumps.wikimedia.org/",
    credit: { auteur: "Glossyqueen", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Books_on_shelves_(121).jpg" },
    motsCles: ["texte", "corpus", "nlp", "langue", "wikipedia", "arabe", "kabyle", "llm", "ويكيبيديا"],
  },
  {
    id: "opus", nom: "OPUS", domaine: "langues", categorie: "culture-tourisme", types: ["texte"],
    licence: "selon-corpus", licenceRestreinte: true, acces: "libre", hebergeur: "University of Helsinki", url: "https://opus.nlpl.eu/",
    credit: { auteur: "Vermondo", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Tizi_Ouzou_Tasdawit.jpg" },
    motsCles: ["traduction", "translation", "parallele", "parallèle", "corpus", "arabe", "français", "ترجمة"],
  },
  {
    id: "era5", nom: "Copernicus ERA5", domaine: "climat", categorie: "environnement", types: ["grilles", "series"],
    licence: "copernicus", acces: "inscription", hebergeur: "Copernicus Climate Data Store", url: "https://cds.climate.copernicus.eu/",
    credit: { auteur: "Pir6mon", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Tadrart01.JPG" },
    motsCles: ["climat", "climate", "meteo", "météo", "temperature", "température", "pluie", "rain", "vent", "مناخ"],
  },
  {
    id: "sentinel-2", nom: "Sentinel-2", domaine: "satellite", categorie: "environnement", types: ["images"],
    licence: "acces-libre", acces: "inscription", hebergeur: "Copernicus (ESA)", url: "https://dataspace.copernicus.eu/",
    credit: { auteur: "SentinelHub", licence: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Sand_Dunes_of_Algeria_(51255339944).png" },
    motsCles: ["satellite", "teledetection", "télédétection", "imagerie", "sol", "remote sensing", "قمر صناعي"],
  },
  {
    id: "eurosat", nom: "EuroSAT", domaine: "satellite", categorie: "environnement", types: ["images"],
    licence: "MIT", acces: "libre", hebergeur: "DFKI (GitHub)", url: "https://github.com/phelber/EuroSAT", chiffre: "27 000",
    credit: { auteur: "Bhullargraphic", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_agricultural_fields_in_Punjab,_India.jpg" },
    motsCles: ["satellite", "occupation du sol", "land cover", "classification", "sentinel"],
  },
  {
    id: "coco", nom: "COCO", domaine: "satellite", categorie: null, types: ["images"],
    licence: "cc-by-annotations", acces: "libre", hebergeur: "COCO Consortium", url: "https://cocodataset.org/",
    credit: { auteur: "Habib kaki", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:Alger_rue_Hassiba_Ben_Bouali_%D8%B4%D8%A7%D8%B1%D8%B9_%D8%AD%D8%B3%D9%8A%D8%A8%D8%A9_%D8%A8%D9%86_%D8%A8%D9%88%D8%B9%D9%84%D9%8A_%D8%A8%D8%A7%D9%84%D8%AC%D8%B2%D8%A7%D8%A6%D8%B1.jpg" },
    motsCles: ["vision", "detection", "détection", "objets", "objects", "segmentation", "photo", "رؤية"],
  },
  {
    id: "banque-mondiale", nom: "World Bank WDI", domaine: "economie", categorie: "economie", types: ["series"],
    licence: "CC BY 4.0", acces: "libre", hebergeur: "World Bank", url: "https://databank.worldbank.org/source/world-development-indicators", chiffre: "1 400+",
    credit: { auteur: "Toufik Lerari", licence: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/wiki/File:Bay_of_Algiers_by_night.jpg" },
    motsCles: ["economie", "économie", "pib", "gdp", "indicateurs", "world bank", "developpement", "اقتصاد"],
  },
  {
    id: "owid", nom: "Our World in Data", domaine: "economie", categorie: "economie", types: ["series"],
    licence: "CC BY 4.0", acces: "libre", hebergeur: "University of Oxford", url: "https://ourworldindata.org/",
    credit: { auteur: "NASA (Apollo 17)", licence: "Public domain", page: "https://commons.wikimedia.org/wiki/File:The_Blue_Marble,_AS17-148-22727.jpg" },
    motsCles: ["statistiques", "pays", "comparaison", "energie", "énergie", "sante", "santé", "population"],
  },
  {
    id: "faostat", nom: "FAOSTAT", domaine: "agriculture", categorie: "agriculture", types: ["series"],
    licence: "conditions-fao", licenceRestreinte: true, acces: "libre", hebergeur: "FAO (United Nations)", url: "https://www.fao.org/faostat/",
    credit: { auteur: "SEBBANE Abdelouahab", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Abou_El_Hassen_surrounded_by_wheat_fields.jpg" },
    motsCles: ["agriculture", "cultures", "rendement", "ble", "blé", "alimentation", "food", "زراعة"],
  },
  {
    id: "openstreetmap", nom: "OpenStreetMap (Geofabrik)", domaine: "mobilite", categorie: "transport", types: ["cartes"],
    licence: "ODbL", acces: "libre", hebergeur: "Geofabrik", url: "https://download.geofabrik.de/africa/algeria.html",
    credit: { auteur: "Magharebia", licence: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Alger_inaugure_son_nouveau_r%C3%A9seau_de_tramway.jpg" },
    motsCles: ["carte", "routes", "rues", "graphe", "itineraire", "itinéraire", "osm", "transport", "خريطة"],
  },
];

const normaliser = (texte: string) => texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const motsDe = (texte: string): string[] => normaliser(texte).match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];

/**
 * Ressources à montrer dans le catalogue : même filtre que lui (catégorie, puis recherche). Sans aucun filtre,
 * toutes. Avec une recherche, chaque mot doit commencer un mot du nom, des mots-clés ou des textes traduits fournis.
 */
export function ressourcesCorrespondantes(
  ressources: RessourceIA[],
  { terme, categorie }: { terme: string; categorie: string | null },
  textes: (ressource: RessourceIA) => string[] = () => [],
): RessourceIA[] {
  const recherche = motsDe(terme);
  return ressources.filter((ressource) => {
    if (categorie && ressource.categorie !== categorie) return false;
    if (recherche.length === 0) return true;
    const mots = new Set([ressource.nom, ressource.hebergeur, ...ressource.motsCles, ...textes(ressource)].flatMap(motsDe));
    return recherche.every((mot) => [...mots].some((candidat) => candidat.startsWith(mot)));
  });
}

/** Ressources d'un domaine, dans l'ordre de la liste. */
export const ressourcesDuDomaine = (domaine: DomaineIA, ressources: RessourceIA[] = RESSOURCES_IA) =>
  ressources.filter((ressource) => ressource.domaine === domaine);

/**
 * Données algériennes du catalogue pour un domaine (ses catégories), les plus téléchargées puis les plus vues d'abord.
 */
export function donneesDuDomaine(domaine: DomaineIA, catalogue: ResumeDonnee[], limite = 3): ResumeDonnee[] {
  const categories: readonly string[] = DOMAINES_IA.find((element) => element.code === domaine)?.categories ?? [];
  return catalogue
    .filter((donnee) => donnee.categorie_slug !== null && categories.includes(donnee.categorie_slug))
    .sort((a, b) => (b.nb_telechargements ?? 0) - (a.nb_telechargements ?? 0) || (b.nb_vues ?? 0) - (a.nb_vues ?? 0) || a.slug.localeCompare(b.slug))
    .slice(0, limite);
}

/** Une licence en minuscules et tirets est une clé traduite (`ressourcesIA.licences.<clé>`), sinon un code affiché tel quel. */
export const estCleLicence = (licence: string) => /^[a-z-]+$/.test(licence);

/** Image de la carte (WebP 800 × 480 dans public/). */
export const imageRessource = (ressource: Pick<RessourceIA, "id">) => `/ressources-ia/${ressource.id}.webp`;

/** Choix mémorisé de l'interrupteur du catalogue (localStorage, lecture tolérante). */
export const CLE_AFFICHAGE_RESSOURCES = "data-dz:ressources-ia:afficher";
export function lireAffichageRessources(stockage: Pick<Storage, "getItem"> | null): boolean {
  try {
    return stockage?.getItem(CLE_AFFICHAGE_RESSOURCES) !== "0";
  } catch {
    return true;
  }
}
