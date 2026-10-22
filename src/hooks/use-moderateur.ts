import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexte/ContexteAuth";
import { compterEnAttente, estModerateur } from "@/lib/soumissions";

/** Le membre connecté est-il modérateur ou admin ? (rpc est_moderateur, la base reste seule juge). */
export function useEstModerateur() {
  const { utilisateur } = useAuth();
  return useQuery({
    queryKey: ["est-moderateur", utilisateur?.id],
    queryFn: estModerateur,
    enabled: Boolean(utilisateur),
    staleTime: 5 * 60 * 1000,
  });
}

/** Nombre de propositions en attente, pour le badge de l'en-tête (modérateurs seulement). */
export function useNbEnAttente(actif: boolean) {
  return useQuery({
    queryKey: ["moderation", "en-attente"],
    queryFn: compterEnAttente,
    enabled: actif,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
