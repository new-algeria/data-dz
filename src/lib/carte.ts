// Réglages et fonctions partagés par les cartes (fiche et visuel).

/** Dégradé de vert de la carte des wilayas (du plus faible au plus fort). */
export const DEGRADE_VERT = ["#d1fae5", "#6ee7b7", "#10b981", "#047857", "#064e3b"];
export const COULEUR_SANS_VALEUR = "#e5e7eb";

// Champs lisibles mis en avant dans la popup, par ordre de préférence ; puis les autres champs texte.
const CLES_LISIBLES = ["nom", "name", "name_fr", "nom_fr", "titre", "label", "libelle", "adresse", "address", "commune", "daira", "wilaya", "ville", "operator", "operateur"];
// Identifiants et champs techniques : jamais affichés dans la popup.
const MOTIF_TECHNIQUE = /^(id|fid|gid|uuid|objectid|source|refs?)$|(^|_)(id|code|ref|refs|osm|wikidata|geo|precision|method|lat|lng|lon|latitude|longitude)(_|$)/i;
const NB_CHAMPS_POPUP = 3;

/** Les 3 premiers champs texte lisibles (nom, adresse, commune…), sans doublon ni identifiant technique. */
export function champsLisibles(proprietes: Record<string, unknown>, langue: string): [string, string][] {
  const textes = Object.entries(proprietes).filter(
    (entree): entree is [string, string] => typeof entree[1] === "string" && entree[1].trim() !== "" && !MOTIF_TECHNIQUE.test(entree[0]) && entree[1].length <= 200
  );
  const rang = (cle: string) => {
    const normalisee = cle.toLowerCase();
    if (langue === "ar" && /(^|_)ar$/.test(normalisee)) return -1;
    const indice = CLES_LISIBLES.indexOf(normalisee);
    return indice === -1 ? CLES_LISIBLES.length : indice;
  };
  const vus = new Set<string>();
  return [...textes]
    .sort((a, b) => rang(a[0]) - rang(b[0]))
    .filter(([, valeur]) => !vus.has(valeur.trim()) && vus.add(valeur.trim()))
    .slice(0, NB_CHAMPS_POPUP);
}
