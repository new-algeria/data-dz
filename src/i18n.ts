import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationEN from "./locales/en/translation.json";
import translationFR from "./locales/fr/translation.json";
import translationAR from "./locales/ar/translation.json";
import { rechercheApresChangement } from "./lib/langues-seo";

export const languesDisponibles = ["fr", "en", "ar"] as const;
export type Langue = (typeof languesDisponibles)[number];

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR },
  ar: { translation: translationAR },
};

/** Met à jour `lang` et `dir` sur <html> : l'arabe s'affiche de droite à gauche. */
function appliquerSensEcriture(langue: string) {
  const racine = document.documentElement;
  racine.lang = langue;
  racine.dir = i18n.dir(langue);
}

i18n.on("languageChanged", appliquerSensEcriture);

/**
 * Adresse qui impose une langue (?lng=fr, liens du sitemap) : le paramètre suit le choix du visiteur,
 * sinon un rechargement reviendrait à l'ancienne langue.
 */
i18n.on("languageChanged", (langue) => {
  const recherche = rechercheApresChangement(window.location.search, langue);
  if (recherche !== null) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${recherche}${window.location.hash}`);
  }
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: languesDisponibles,
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
