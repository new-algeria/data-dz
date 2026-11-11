import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { sectionDeChemin, type Section } from "@/lib/sections";

/** Section colorée de la page affichée (logo, couleur, favicons), recalculée à chaque navigation. */
export function useSection(): Section {
  const { pathname } = useLocation();
  return useMemo(() => sectionDeChemin(pathname), [pathname]);
}
