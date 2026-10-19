import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { estEnRecuperationMotDePasse, supabase, terminerRecuperationMotDePasse } from "@/lib/supabase";
import { chargerProfil } from "@/lib/profils";
import { ContexteAuth, type ValeurAuth } from "./ContexteAuth";

export const FournisseurAuth = ({ children }: { children: ReactNode }) => {
  const clientRequetes = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);
  const [recuperation, setRecuperation] = useState(estEnRecuperationMotDePasse);

  useEffect(() => {
    let actif = true;
    // getSession attend la fin de l'initialisation (dont l'échange d'un éventuel ?code= dans l'URL).
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      setSession(data.session);
      setRecuperation(estEnRecuperationMotDePasse());
      setChargement(false);
    });

    // Pas d'appel à Supabase dans ce rappel (risque de blocage) : on ne fait que mettre l'état à jour.
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelleSession) => {
      setSession(nouvelleSession);
      setChargement(false);
      if (evenement === "PASSWORD_RECOVERY") setRecuperation(true);
      if (evenement === "SIGNED_OUT") {
        setRecuperation(false);
        clientRequetes.removeQueries({ queryKey: ["profil"] });
      }
    });

    return () => {
      actif = false;
      data.subscription.unsubscribe();
    };
  }, [clientRequetes]);

  const utilisateur = session?.user ?? null;
  const requeteProfil = useQuery({
    queryKey: ["profil", utilisateur?.id],
    queryFn: () => chargerProfil(utilisateur!.id),
    enabled: Boolean(utilisateur),
    staleTime: 60 * 1000,
  });

  const terminerRecuperation = useCallback(() => {
    terminerRecuperationMotDePasse();
    setRecuperation(false);
  }, []);

  const valeur = useMemo<ValeurAuth>(
    () => ({
      session,
      utilisateur,
      profil: utilisateur ? requeteProfil.data ?? null : null,
      chargement,
      chargementProfil: Boolean(utilisateur) && requeteProfil.isPending,
      recuperation,
      terminerRecuperation,
      rechargerProfil: requeteProfil.refetch,
    }),
    [session, utilisateur, requeteProfil.data, requeteProfil.isPending, requeteProfil.refetch, chargement, recuperation, terminerRecuperation]
  );

  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>;
};
