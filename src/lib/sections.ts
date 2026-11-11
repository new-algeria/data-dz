import LOGO_VERT from "@/assets/img/data_dz_logo_icon.png";
import LOGO_VIOLET from "@/assets/img/data-dz-logo-api-violet.png";
import LOGO_BLEU from "@/assets/img/data-dz-logo-djazai-bleu.png";
import { routes } from "./routes";

/**
 * Sections colorées du site : même logo data-dz, couleur propre à chaque section (logo de l'en-tête,
 * nom à côté, favicon). Pour en ajouter une : une entrée dans `SECTIONS_COLOREES`, son logo dans
 * `src/assets/img/` et ses favicons dans `public/favicons/` (voir `faviconsDe`).
 */
export type CleSection = "defaut" | "api" | "djazai";

export interface Favicons {
  ico: string;
  png16: string;
  png32: string;
  apple: string;
}

export interface Section {
  cle: CleSection;
  /** Début des chemins de la section (la page et toutes ses sous-pages). */
  prefixe: string | null;
  logo: string;
  /** Couleur de la section (partie colorée du nom affiché à côté du logo). */
  couleur: string;
  favicons: Favicons;
}

/** Vert de « -dz », gardé dans le nom de la page API. */
export const VERT_DATA_DZ = "#10b981";

const faviconsDe = (cle: Exclude<CleSection, "defaut">): Favicons => ({
  ico: `/favicons/favicon-${cle}.ico`,
  png16: `/favicons/favicon-${cle}-16x16.png`,
  png32: `/favicons/favicon-${cle}-32x32.png`,
  apple: `/favicons/apple-touch-icon-${cle}.png`,
});

export const SECTION_DEFAUT: Section = {
  cle: "defaut",
  prefixe: null,
  logo: LOGO_VERT,
  couleur: VERT_DATA_DZ,
  favicons: { ico: "/favicon.ico", png16: "/favicon-16x16.png", png32: "/favicon-32x32.png", apple: "/apple-touch-icon.png" },
};

export const SECTIONS_COLOREES: Section[] = [
  { cle: "api", prefixe: routes.api, logo: LOGO_VIOLET, couleur: "#8b5cf6", favicons: faviconsDe("api") },
  { cle: "djazai", prefixe: routes.djazai, logo: LOGO_BLEU, couleur: "#2f80ed", favicons: faviconsDe("djazai") },
];

/** La section d'un chemin : `/api`, `/api/...` → API ; `/apis` n'en fait pas partie. Sinon la section par défaut. */
export function sectionDeChemin(chemin: string): Section {
  const propre = chemin.replace(/\/+$/, "").toLowerCase() || "/";
  return (
    SECTIONS_COLOREES.find((section) => section.prefixe && (propre === section.prefixe || propre.startsWith(`${section.prefixe}/`)))
    ?? SECTION_DEFAUT
  );
}

/** Logo de DjazAI (bulle, avatar de l'assistant), quelle que soit la page. */
export const LOGO_DJAZAI = LOGO_BLEU;
export const BLEU_DJAZAI = "#2f80ed";
