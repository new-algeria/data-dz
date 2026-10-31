/**
 * Unité du grand chiffre (cartes du catalogue, en-tête de la fiche) : « 586 plages », « 2 170 stations ».
 * 1. Table par identifiant pour les données connues (fr / en / ar), écrite à la main d'après le contenu réel.
 * 2. Sinon, unité devinée à partir du titre dans la langue affichée. Repli : « éléments » / « elements » / « عناصر ».
 */

export type LangueUnite = "fr" | "en" | "ar";

type Unites = Record<LangueUnite, string>;

const REPLI: Unites = { fr: "éléments", en: "elements", ar: "عناصر" };

/** Ce que compte chaque ligne des données du catalogue (identifiant → unité). */
export const UNITES_PAR_SLUG: Record<string, Unites> = {
  mosquees: { fr: "mosquées", en: "mosques", ar: "مساجد" },
  "terrains-de-football": { fr: "terrains", en: "pitches", ar: "ملاعب" },
  dams: { fr: "barrages", en: "dams", ar: "سدود" },
  "gas-stations": { fr: "stations", en: "stations", ar: "محطات" },
  plages: { fr: "plages", en: "beaches", ar: "شواطئ" },
  bibliotheques: { fr: "bibliothèques", en: "libraries", ar: "مكتبات" },
  "desalination-plants": { fr: "stations", en: "plants", ar: "محطات" },
  buses: { fr: "lignes", en: "lines", ar: "خطوط" },
  tourisme: { fr: "lieux", en: "places", ar: "مواقع" },
  sante: { fr: "établissements", en: "facilities", ar: "مؤسسات" },
  poste: { fr: "bureaux et GAB", en: "offices and ATMs", ar: "مكاتب وصرافات" },
  pharmacies: { fr: "pharmacies", en: "pharmacies", ar: "صيدليات" },
  ooredoo: { fr: "boutiques", en: "stores", ar: "متاجر" },
  "formation-professionnelle": { fr: "établissements", en: "institutions", ar: "مؤسسات" },
  ferroviaire: { fr: "gares", en: "stations", ar: "محطات" },
  "enseignement-superieur": { fr: "établissements", en: "institutions", ar: "مؤسسات" },
  ecoles: { fr: "écoles", en: "schools", ar: "مدارس" },
  culture: { fr: "sites", en: "sites", ar: "مواقع" },
  cliniques: { fr: "structures de soins", en: "care facilities", ar: "مرافق صحية" },
  banques: { fr: "établissements", en: "institutions", ar: "مؤسسات" },
  aviation: { fr: "aéroports", en: "airports", ar: "مطارات" },
  // 1 541 lignes : les communes (avec leur daïra et leur wilaya).
  "divisions-administratives": { fr: "communes", en: "municipalities", ar: "بلديات" },
  telecom: { fr: "points", en: "points", ar: "نقاط" },
  sports: { fr: "installations", en: "facilities", ar: "منشآت" },
  "protection-civile": { fr: "unités", en: "units", ar: "وحدات" },
  mobilis: { fr: "points de vente", en: "outlets", ar: "نقاط بيع" },
  livraison: { fr: "points relais", en: "stop-desks", ar: "نقاط استلام" },
  jeunesse: { fr: "établissements", en: "institutions", ar: "مؤسسات" },
  "industrie-pharmaceutique": { fr: "fabricants", en: "manufacturers", ar: "مصانع" },
  "gares-routieres": { fr: "gares routières", en: "bus stations", ar: "محطات" },
  emploi: { fr: "agences", en: "agencies", ar: "وكالات" },
  djezzy: { fr: "boutiques", en: "stores", ar: "متاجر" },
  agriculture: { fr: "institutions", en: "institutions", ar: "مؤسسات" },
};

const ARABE = /[؀-ۿ]/;

/** Coupe le titre avant « : », « ( », « , », un tiret entre espaces ou « et » / « and » / « & ». */
const SEPARATEURS = /\s*[:(,،–—]|\s-\s|\s(?:et|and|&)\s/i;

/** Mentions du pays, retirées avant de deviner (« Mosquées d'Algérie », « Algeria mosques », « Algerian … »). */
const PAYS = /\s+(?:d['’]Algérie|de l['’]Algérie|en Algérie|algérien(?:ne)?s?)\b|\b(?:Algeria|Algerian|Algeria's)\s+|\s+(?:in|of) Algeria\b/gi;

/** Articles du début, retirés (« Les plages » → « plages »). */
const ARTICLES = /^(?:les|des|the)\s+/i;

/** Mots trop vagues pour servir d'unité : « 69 divisions » ou « 1 200 données » ne disent rien de ce qu'on compte. */
const MOTS_VAGUES = new Set([
  "divisions",
  "données",
  "donnees",
  "data",
  "statistiques",
  "statistics",
  "chiffres",
  "figures",
  "indicateurs",
  "indicators",
  "informations",
  "résultats",
  "results",
  "listes",
  "lists",
  "limites",
  "contours",
  "boundaries",
  "economy",
  "économie",
]);

/** Partie du titre avant le premier séparateur (« Mairies (APC) » → « Mairies »). */
export function titreCourt(titre: string): string {
  return titre.split(SEPARATEURS)[0].replace(/\s+/g, " ").trim();
}

const pluriel = (mot: string) => /[sx]$/.test(mot) && !MOTS_VAGUES.has(mot);

export function devinerUnite(titre: string, langue: LangueUnite, slug?: string): string {
  const connue = slug ? UNITES_PAR_SLUG[slug] : undefined;
  if (connue) return connue[langue];

  const court = titreCourt(titre.replace(PAYS, " "));
  // Arabe : premier mot du titre court, sans l'article « ال » (« المكتبات » → « مكتبات »).
  if (langue === "ar" || ARABE.test(court)) {
    const mot = court.split(" ")[0] ?? "";
    return (mot.length > 4 ? mot.replace(/^ال/, "") : mot) || REPLI.ar;
  }

  const mots = court.replace(ARTICLES, "").toLocaleLowerCase(langue).split(" ").filter(Boolean);
  if (mots.length === 0) return REPLI[langue];
  // Mot composé : son premier élément (« stations-service » → « stations »).
  mots[0] = mots[0].split("-")[0];

  if (langue === "en") {
    // En anglais, le nom compté est à la fin (« fuel stations », « football pitches »).
    if (mots.length <= 3) return pluriel(mots[mots.length - 1]) ? mots.join(" ") : REPLI.en;
    return pluriel(mots[mots.length - 1]) ? mots[mots.length - 1] : REPLI.en;
  }
  // En français, il est au début (« écoles primaires », « établissements de formation professionnelle »).
  if (!pluriel(mots[0])) return REPLI[langue];
  return mots.length <= 3 ? mots.join(" ") : mots[0];
}
