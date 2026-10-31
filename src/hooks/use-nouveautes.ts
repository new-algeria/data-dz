import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { chargerCatalogue } from "@/lib/catalogue";
import { seuilNouveautes } from "@/lib/recents";

/**
 * Seuil des nouveautés (`seuilNouveautes()`), calculé sur le catalogue complet déjà en cache (clé de l'accueil).
 * Lecture du cache seulement : une page qui ne charge pas le catalogue (favoris) n'affiche simplement aucun « Nouveau ».
 */
export function useSeuilNouveautes(): number | null {
  const { data } = useQuery({
    queryKey: ["catalogue", "", null],
    queryFn: () => chargerCatalogue({ terme: "", categorie: null }),
    enabled: false,
  });
  return useMemo(() => (data ? seuilNouveautes(data) : null), [data]);
}
