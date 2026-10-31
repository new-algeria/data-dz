import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { chargerCatalogue, chargerCategories } from "@/lib/catalogue";
import { thematiquesDuCatalogue } from "@/lib/thematiques";

/** Thématiques avec leur nombre de données (mêmes clés React Query que l'accueil : aucune requête en plus). */
export function useThematiques(nbExemples = 3) {
  const categories = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const catalogue = useQuery({ queryKey: ["catalogue", "", null], queryFn: () => chargerCatalogue({ terme: "", categorie: null }) });
  const thematiques = useMemo(
    () => thematiquesDuCatalogue(categories.data ?? [], catalogue.data ?? [], nbExemples),
    [categories.data, catalogue.data, nbExemples]
  );
  return {
    thematiques,
    chargement: categories.isPending || catalogue.isPending,
    erreur: categories.isError || catalogue.isError,
    reessayer: () => {
      void categories.refetch();
      void catalogue.refetch();
    },
  };
}
