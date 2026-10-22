import { supabase } from "./supabase";
import { urlFichier } from "./fichiers";
import type { TexteMultilingue } from "./types";

export interface LicenceResume {
  code: string;
  nom: string;
}

export async function chargerLicences(): Promise<LicenceResume[]> {
  const { data, error } = await supabase.from("licences").select("code, nom").order("nom");
  if (error) throw error;
  return (data ?? []) as LicenceResume[];
}

// ---------------------------------------------------------------------------------------------
// Wilayas : noms lus dans le fichier publié du catalogue (GeoAlgeria, json/wilayas.json),
// pour ne jamais écrire de noms à la main. Repli : les seuls codes 01 à 69.
// ---------------------------------------------------------------------------------------------

export interface Wilaya {
  code: string;
  nom: TexteMultilingue;
}

export const CODES_WILAYAS = Array.from({ length: 69 }, (_, indice) => String(indice + 1).padStart(2, "0"));

const premierTexte = (objet: Record<string, unknown>, cles: string[]) => {
  for (const cle of cles) {
    const valeur = objet[cle];
    if (typeof valeur === "string" && valeur.trim()) return valeur.trim();
  }
  return undefined;
};

/** Lit une liste de wilayas quelle que soit sa forme exacte (tableau, { wilayas: [...] }, GeoJSON). */
function extraireWilayas(contenu: unknown): Wilaya[] {
  const liste = Array.isArray(contenu)
    ? contenu
    : typeof contenu === "object" && contenu !== null
      ? (Object.values(contenu).find(Array.isArray) as unknown[] | undefined) ?? []
      : [];

  const wilayas = new Map<string, Wilaya>();
  for (const element of liste) {
    if (typeof element !== "object" || element === null) continue;
    const brut = element as Record<string, unknown>;
    const objet = (typeof brut.properties === "object" && brut.properties !== null ? brut.properties : brut) as Record<string, unknown>;
    const codeBrut = objet.code ?? objet.wilaya_code ?? objet.id ?? objet.mattricule ?? objet.matricule;
    const code = String(codeBrut ?? "").padStart(2, "0");
    if (!CODES_WILAYAS.includes(code)) continue;
    const fr = premierTexte(objet, ["name_fr", "nom_fr", "name", "nom", "name_en"]);
    const ar = premierTexte(objet, ["name_ar", "nom_ar", "ar_name"]);
    const en = premierTexte(objet, ["name_en", "name_ascii", "name"]);
    if (fr) wilayas.set(code, { code, nom: { fr, en, ar } });
  }
  return [...wilayas.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export async function chargerWilayas(): Promise<Wilaya[]> {
  try {
    const reponse = await fetch(urlFichier("json/wilayas.json"));
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const wilayas = extraireWilayas(await reponse.json());
    if (wilayas.length >= 48) return wilayas;
    throw new Error("liste de wilayas incomplète");
  } catch (erreur) {
    console.warn("Noms des wilayas indisponibles, affichage des codes seuls :", erreur);
    return CODES_WILAYAS.map((code) => ({ code, nom: {} }));
  }
}

// ---------------------------------------------------------------------------------------------
// Données existantes, pour proposer une mise à jour
// ---------------------------------------------------------------------------------------------

export interface DonneeModifiable {
  id: string;
  slug: string;
  titre: TexteMultilingue;
  description: TexteMultilingue | null;
  categorie_slug: string | null;
  licence_code: string | null;
  url_source: string | null;
  mots_cles: string[] | null;
  wilayas: string[] | null;
  sources: { slug: string; nom: string; type: string } | null;
}

/**
 * Les données synchronisées automatiquement (source de type « synchronisee », comme GeoAlgeria)
 * se corrigent chez leur source : la base refuse une proposition de mise à jour pour elles.
 */
export const estSynchronisee = (donnee: Pick<DonneeModifiable, "sources">) =>
  donnee.sources?.type === "synchronisee" || donnee.sources?.slug === "geoalgeria";

export async function rechercherDonnees(terme: string): Promise<DonneeModifiable[]> {
  let requete = supabase
    .from("datasets")
    .select("id, slug, titre, description, categorie_slug, licence_code, url_source, mots_cles, wilayas, sources ( slug, nom, type )")
    .eq("statut", "publie");
  if (terme.trim()) {
    requete = requete.textSearch("recherche", terme.trim(), { config: "simple", type: "websearch" });
  }
  const { data, error } = await requete.order("titre->>fr").limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as DonneeModifiable[];
}
