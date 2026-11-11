import { useEffect } from "react";
import { useSection } from "@/hooks/use-section";

/** Liens d'icône d'`index.html` (repérés par leur id) et la clé de la section qui leur correspond. */
const LIENS = [
  ["favicon-ico", "ico"],
  ["favicon-32", "png32"],
  ["favicon-16", "png16"],
  ["apple-touch-icon", "apple"],
] as const;

/** Favicon aux couleurs de la section (violet sur /api, bleu sur /djazai, vert ailleurs), changé sans rechargement. */
export const FaviconSection = () => {
  const { favicons } = useSection();
  useEffect(() => {
    for (const [id, cle] of LIENS) {
      const lien = document.getElementById(id);
      if (lien instanceof HTMLLinkElement && lien.getAttribute("href") !== favicons[cle]) lien.setAttribute("href", favicons[cle]);
    }
  }, [favicons]);
  return null;
};
