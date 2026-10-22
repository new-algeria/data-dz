import { useSearchParams } from "react-router-dom";
import { suiteSure } from "@/lib/auth";
import { ANCIEN_PARAMETRE_SUITE, PARAMETRE_SUITE } from "@/lib/routes";

/** Page où revenir après connexion, lue dans ?next= (ou l'ancien ?suite=) et limitée aux chemins internes. */
export function useSuite(defaut = "/"): string {
  const [parametres] = useSearchParams();
  return suiteSure(parametres.get(PARAMETRE_SUITE) ?? parametres.get(ANCIEN_PARAMETRE_SUITE), defaut);
}
