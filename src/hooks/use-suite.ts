import { useSearchParams } from "react-router-dom";
import { suiteSure } from "@/lib/auth";

/** Page où revenir après connexion, lue dans ?suite= et limitée aux chemins internes. */
export function useSuite(defaut = "/"): string {
  const [parametres] = useSearchParams();
  return suiteSure(parametres.get("suite"), defaut);
}
