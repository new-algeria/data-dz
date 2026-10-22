// Aperçu des fichiers proposés (CSV, JSON, GeoJSON) pour les modérateurs : 20 premières lignes.

export const LIGNES_APERCU = 20;
/** Un CSV n'est lu que jusqu'à cette taille : assez pour 20 lignes, sans télécharger 50 Mo. */
const OCTETS_MAX_CSV = 512 * 1024;
/** Un JSON doit être lu en entier pour être analysé : au-delà, on propose seulement le téléchargement. */
export const TAILLE_MAX_APERCU_JSON = 10 * 1024 * 1024;
const COLONNES_MAX = 30;

export type Cellule = string | number | boolean | null;

export interface Apercu {
  colonnes: string[];
  lignes: Cellule[][];
  /** Le fichier contient plus de lignes que celles affichées (ou n'a pas été lu en entier). */
  tronque: boolean;
}

export const formatsApercu = ["csv", "json", "geojson"] as const;
export const aUnApercu = (format: string) => (formatsApercu as readonly string[]).includes(format);

/** Lit au plus `octetsMax` octets du flux, puis abandonne le téléchargement. */
async function lireDebut(reponse: Response, octetsMax: number): Promise<{ texte: string; complet: boolean }> {
  if (!reponse.body) {
    const texte = await reponse.text();
    return { texte: texte.slice(0, octetsMax), complet: texte.length <= octetsMax };
  }
  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder("utf-8");
  let texte = "";
  let octets = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) return { texte: texte + decodeur.decode(), complet: true };
    octets += value.byteLength;
    texte += decodeur.decode(value, { stream: true });
    if (octets >= octetsMax) {
      await lecteur.cancel();
      return { texte, complet: false };
    }
  }
}

/** Séparateur le plus probable parmi , ; tabulation et |, d'après la première ligne. */
function detecterSeparateur(premiereLigne: string): string {
  const candidats = [",", ";", "\t", "|"];
  const compter = (separateur: string) => {
    let n = 0;
    let entreGuillemets = false;
    for (const caractere of premiereLigne) {
      if (caractere === '"') entreGuillemets = !entreGuillemets;
      else if (caractere === separateur && !entreGuillemets) n++;
    }
    return n;
  };
  return candidats.reduce((meilleur, candidat) => (compter(candidat) > compter(meilleur) ? candidat : meilleur), ",");
}

/** Analyse CSV minimale (guillemets doublés, retours à la ligne dans les champs), arrêtée après `maxLignes`. */
export function analyserCsv(texte: string, maxLignes: number): string[][] {
  const contenu = texte.replace(/^\uFEFF/, "");
  const separateur = detecterSeparateur(contenu.split(/\r?\n/, 1)[0] ?? "");
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let entreGuillemets = false;

  for (let i = 0; i < contenu.length && lignes.length < maxLignes; i++) {
    const caractere = contenu[i];
    if (entreGuillemets) {
      if (caractere === '"' && contenu[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (caractere === '"') entreGuillemets = false;
      else champ += caractere;
    } else if (caractere === '"') entreGuillemets = true;
    else if (caractere === separateur) {
      ligne.push(champ);
      champ = "";
    } else if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && contenu[i + 1] === "\n") i++;
      ligne.push(champ);
      if (ligne.some((valeur) => valeur !== "")) lignes.push(ligne);
      ligne = [];
      champ = "";
    }
    else champ += caractere;
  }
  if (lignes.length < maxLignes && (champ !== "" || ligne.length)) {
    ligne.push(champ);
    if (ligne.some((valeur) => valeur !== "")) lignes.push(ligne);
  }
  return lignes;
}

const versCellule = (valeur: unknown): Cellule => {
  if (valeur === null || valeur === undefined) return null;
  if (typeof valeur === "string" || typeof valeur === "number" || typeof valeur === "boolean") return valeur;
  const texte = JSON.stringify(valeur);
  return texte.length > 120 ? `${texte.slice(0, 117)}…` : texte;
};

/** Les enregistrements d'un JSON : tableau, FeatureCollection (propriétés + type de géométrie), ou premier tableau trouvé. */
function enregistrements(donnees: unknown): unknown[] | null {
  if (Array.isArray(donnees)) return donnees;
  if (donnees && typeof donnees === "object") {
    const objet = donnees as Record<string, unknown>;
    if (objet.type === "FeatureCollection" && Array.isArray(objet.features)) {
      return objet.features.map((feature) => {
        const f = (feature ?? {}) as { properties?: Record<string, unknown>; geometry?: { type?: string } | null };
        return { ...(f.properties ?? {}), geometrie: f.geometry?.type ?? null };
      });
    }
    const tableau = Object.values(objet).find(Array.isArray);
    if (tableau) return tableau;
    return [objet];
  }
  return null;
}

export function apercuDepuisJson(donnees: unknown): Apercu {
  const liste = enregistrements(donnees) ?? [donnees];
  const premiers = liste.slice(0, LIGNES_APERCU);
  const objets = premiers.every((e) => e !== null && typeof e === "object" && !Array.isArray(e));
  if (!objets) {
    return { colonnes: ["valeur"], lignes: premiers.map((e) => [versCellule(e)]), tronque: liste.length > LIGNES_APERCU };
  }
  const colonnes: string[] = [];
  for (const e of premiers as Record<string, unknown>[]) {
    for (const cle of Object.keys(e)) if (!colonnes.includes(cle) && colonnes.length < COLONNES_MAX) colonnes.push(cle);
  }
  return {
    colonnes,
    lignes: (premiers as Record<string, unknown>[]).map((e) => colonnes.map((cle) => versCellule(e[cle]))),
    tronque: liste.length > LIGNES_APERCU,
  };
}

/** Télécharge (partiellement pour un CSV) et met en forme l'aperçu d'un fichier depuis son lien signé. */
export async function chargerApercu(url: string, format: string): Promise<Apercu> {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);

  if (format === "csv") {
    const { texte, complet } = await lireDebut(reponse, OCTETS_MAX_CSV);
    // Sans le fichier complet, la dernière ligne lue peut être coupée : on l'ignore alors.
    const lignes = analyserCsv(texte, LIGNES_APERCU + 2);
    const [entete = [], ...tout] = lignes;
    const corps = complet || tout.length > LIGNES_APERCU ? tout : tout.slice(0, -1);
    const affichees = corps.slice(0, LIGNES_APERCU);
    return {
      colonnes: entete.slice(0, COLONNES_MAX),
      lignes: affichees.map((ligne) => ligne.slice(0, COLONNES_MAX)),
      tronque: !complet || corps.length > LIGNES_APERCU,
    };
  }

  return apercuDepuisJson(await reponse.json());
}
