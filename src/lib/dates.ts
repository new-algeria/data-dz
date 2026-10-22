import { localeNombres } from "./fichiers";

const UNITES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** « il y a 5 minutes », « hier »… dans la langue affichée. */
export function ilYa(date: string, langue: string, maintenant = Date.now()): string {
  // Une date à peine future (horloge du serveur en avance) s'affiche « maintenant », jamais « dans 1 minute ».
  const secondes = Math.min(0, Math.round((Date.parse(date) - maintenant) / 1000));
  const format = new Intl.RelativeTimeFormat(localeNombres(langue), { numeric: "auto" });
  for (const [unite, duree] of UNITES) {
    if (Math.abs(secondes) >= duree) return format.format(Math.round(secondes / duree), unite);
  }
  return format.format(0, "second");
}

/** Date et heure complètes, pour l'infobulle d'une date relative. */
export const dateComplete = (date: string, langue: string) =>
  new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "long", timeStyle: "short" }).format(new Date(date));
