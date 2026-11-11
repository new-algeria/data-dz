import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { chargerFournisseursActifs, connecterAvecFournisseur, FOURNISSEURS_SOCIAUX, type FournisseurSocial } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";

/**
 * Fournisseurs de connexion activés dans Supabase (Authentication → Providers), dans l'ordre Google, Facebook, GitHub,
 * et la redirection vers l'un d'eux. Tant que les réglages ne sont pas lus, Google est proposé seul.
 */
export function useConnexionSociale(suite: string, surErreur: (cle: string) => void, actif = true) {
  const [redirection, setRedirection] = useState<FournisseurSocial | null>(null);
  const { data: actifs } = useQuery({
    queryKey: ["fournisseurs-auth"],
    queryFn: chargerFournisseursActifs,
    staleTime: 10 * 60 * 1000,
    enabled: actif,
  });
  const fournisseurs: readonly FournisseurSocial[] = actifs
    ? FOURNISSEURS_SOCIAUX.filter((fournisseur) => actifs[fournisseur])
    : ["google"];

  const continuer = async (fournisseur: FournisseurSocial) => {
    setRedirection(fournisseur);
    try {
      await connecterAvecFournisseur(fournisseur, suite);
    } catch (erreur) {
      setRedirection(null);
      surErreur(cleErreur(erreur));
    }
  };

  return { fournisseurs, redirection, continuer };
}
