import { useQuery } from "@tanstack/react-query";
import { chargerSourcesAdmin } from "@/lib/admin-donnees";

export const CLE_SOURCES_ADMIN = ["admin", "sources"] as const;

/** Sources lues sans cache CDN (partagées par le dialogue des données et la mise en ligne des propositions). */
export const useSourcesAdmin = () => useQuery({ queryKey: CLE_SOURCES_ADMIN, queryFn: chargerSourcesAdmin, staleTime: 5 * 60 * 1000 });
