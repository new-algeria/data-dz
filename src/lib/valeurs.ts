/** Représentation textuelle courte d'une valeur JSON quelconque (cellule d'aperçu, infos de la source…). */
export function valeurEnTexte(valeur: unknown, longueurMax = 120): string {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "string") return tronquer(valeur, longueurMax);
  if (typeof valeur === "number" || typeof valeur === "boolean") return String(valeur);
  if (Array.isArray(valeur) && valeur.every((element) => typeof element !== "object" || element === null)) {
    return tronquer(valeur.map(String).join(", "), longueurMax);
  }
  return tronquer(JSON.stringify(valeur), longueurMax);
}

function tronquer(texte: string, longueurMax: number): string {
  return texte.length > longueurMax ? `${texte.slice(0, longueurMax - 1)}…` : texte;
}

export function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}
