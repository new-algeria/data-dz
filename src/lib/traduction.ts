import type { TexteMultilingue } from "./types";

/** Texte dans la langue courante, avec repli sur le français puis l'anglais. */
export function texteTraduit(texte: TexteMultilingue | null | undefined, langue: string): string {
  if (!texte) return "";
  const cle = langue as keyof TexteMultilingue;
  return texte[cle] || texte.fr || texte.en || texte.ar || "";
}
