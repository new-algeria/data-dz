/**
 * Illustration de chaque donnée. Images publiques sur R2 (`files.data-dz.com/web-assets/`), seul dossier
 * du bucket encore servi par le domaine public : les données, elles, passent par l'API.
 *
 * Priorité : `illustration_url` choisie par un administrateur, sinon l'image du pack (data-dz-hero-assets,
 * `web-assets/webp/<nom>.webp` en 1200 × 720 et `<nom>-600.webp` en 600 × 360), sinon la carte de l'Algérie.
 */
const urlWebAssets = `${(import.meta.env.VITE_URL_FICHIERS ?? "https://files.data-dz.com").replace(/\/+$/, "")}/web-assets`;

const illustrationsParSlug: Record<string, string> = {
  agriculture: "03-agriculture",
  aviation: "06-aeroport-transports",
  banques: "11-banques-finance",
  buses: "17-transport-routier",
  cliniques: "04-sante",
  culture: "08-patrimoine-culturel",
  "divisions-administratives": "09-carte-algerie-donnees",
  djezzy: "12-boutiques-telecom",
  ecoles: "05-education",
  emploi: "10-agences-emploi",
  "enseignement-superieur": "27-enseignement-superieur",
  ferroviaire: "19-gares-ferroviaires",
  "formation-professionnelle": "14-formation-professionnelle",
  "gares-routieres": "20-gares-routieres-bus",
  "industrie-pharmaceutique": "21-industrie-pharmaceutique",
  jeunesse: "15-sport-jeunesse",
  livraison: "23-points-relais-livraison",
  mobilis: "12-boutiques-telecom",
  mosquees: "24-mosquees",
  ooredoo: "12-boutiques-telecom",
  pharmacies: "22-pharmacies",
  poste: "13-poste-gab",
  "protection-civile": "26-protection-civile",
  sante: "04-sante",
  sports: "15-sport-jeunesse",
  telecom: "02-antennes-telecom",
  tourisme: "18-tourisme-nature",
};

const illustrationParDefaut = "09-carte-algerie-donnees";

export function urlIllustration(
  donnee: { slug: string; illustration_url?: string | null },
  taille: "grande" | "petite" = "grande"
): string {
  if (donnee.illustration_url) return donnee.illustration_url;
  const nom = illustrationsParSlug[donnee.slug] ?? illustrationParDefaut;
  return `${urlWebAssets}/webp/${nom}${taille === "petite" ? "-600" : ""}.webp`;
}
