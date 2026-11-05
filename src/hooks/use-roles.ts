import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexte/ContexteAuth";
import { chargerRoles, permissionsMembre, type Permission } from "@/lib/roles";

/** Tous les rôles (système et personnalisés), lus une fois par session ou presque : ils changent rarement. */
export const useRoles = () => useQuery({ queryKey: ["roles"], queryFn: chargerRoles, staleTime: 5 * 60 * 1000 });

/**
 * Permissions du membre connecté (toutes pour un administrateur). Simple confort d'affichage :
 * la base (RLS, rpc) et l'API vérifient chaque action.
 */
export function usePermissions() {
  const { profil } = useAuth();
  const { data: roles, isPending } = useRoles();
  const permissions = permissionsMembre(profil, roles);
  return {
    admin: profil?.role === "admin",
    chargement: Boolean(profil) && profil?.role !== "admin" && isPending,
    a: (permission: Permission) => permissions.has(permission),
    /** Au moins une page d'administration accessible. */
    gestion: profil?.role === "admin" || permissions.has("donnees.gerer") || permissions.has("membres.gerer") || permissions.has("synchro.gerer"),
  };
}
