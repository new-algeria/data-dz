import { useEffect, useState } from "react";

/** Renvoie `valeur` après `delai` ms sans changement (évite une requête à chaque frappe). */
export function useValeurDifferee<T>(valeur: T, delai = 300): T {
  const [valeurDifferee, setValeurDifferee] = useState(valeur);

  useEffect(() => {
    const minuteur = setTimeout(() => setValeurDifferee(valeur), delai);
    return () => clearTimeout(minuteur);
  }, [valeur, delai]);

  return valeurDifferee;
}
