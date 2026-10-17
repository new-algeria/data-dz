import { useTranslation } from "react-i18next";
import type { Langue } from "@/i18n";

/** Langue courante normalisée (`fr`, `en` ou `ar`). */
export function useLangue(): Langue {
  const { i18n } = useTranslation();
  const langue = i18n.resolvedLanguage ?? i18n.language ?? "fr";
  return (["fr", "en", "ar"].includes(langue) ? langue : "fr") as Langue;
}
