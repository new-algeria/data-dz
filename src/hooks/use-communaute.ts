import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexte/ContexteAuth";
import { ajusterCompteurs, changerFavori, chargerMesFavoris, chargerMesVotes, effetVote, enregistrerVote, type Vote } from "@/lib/communaute";
import { cleErreur } from "@/lib/erreurs";
import { avecSuite, routes } from "@/lib/routes";

/** Visiteur : renvoie vers /login en mémorisant la page (et l'ancre) actuelle. */
export function useInviterConnexion() {
  const naviguer = useNavigate();
  const emplacement = useLocation();
  return () => naviguer(avecSuite(routes.connexion, `${emplacement.pathname}${emplacement.search}${emplacement.hash}`));
}

/** Votes du membre connecté (une seule requête pour toutes les cartes). */
export function useMesVotes() {
  const { utilisateur } = useAuth();
  return useQuery({ queryKey: ["mes-votes", utilisateur?.id], queryFn: chargerMesVotes, enabled: Boolean(utilisateur) });
}

export function useMesFavoris() {
  const { utilisateur } = useAuth();
  return useQuery({ queryKey: ["mes-favoris", utilisateur?.id], queryFn: chargerMesFavoris, enabled: Boolean(utilisateur) });
}

/**
 * Vote 👍 / 👎 sur une donnée, avec mise à jour optimiste : un clic vote, un second clic sur le même bouton
 * retire le vote, l'autre bouton le change. En cas d'erreur, le cache est restauré.
 */
export function useVote(datasetId: string) {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const clientRequetes = useQueryClient();
  const inviterConnexion = useInviterConnexion();
  const { data: votes } = useMesVotes();
  const [enCours, setEnCours] = useState(false);
  const vote: Vote | null = votes?.[datasetId] ?? null;

  const voter = async (clic: Vote) => {
    if (!utilisateur) return inviterConnexion();
    if (enCours) return;
    const cleVotes = ["mes-votes", utilisateur.id];
    const ancien: Vote | null = clientRequetes.getQueryData<Record<string, Vote>>(cleVotes)?.[datasetId] ?? null;
    const nouveau = ancien === clic ? null : clic;

    setEnCours(true);
    const annulerCompteurs = ajusterCompteurs(clientRequetes, datasetId, effetVote(ancien, nouveau));
    clientRequetes.setQueryData<Record<string, Vote>>(cleVotes, (precedents = {}) => {
      const suivants = { ...precedents };
      if (nouveau === null) delete suivants[datasetId];
      else suivants[datasetId] = nouveau;
      return suivants;
    });
    try {
      await enregistrerVote(datasetId, ancien, nouveau);
    } catch (e) {
      annulerCompteurs();
      clientRequetes.invalidateQueries({ queryKey: cleVotes });
      toast.error(t("communaute.erreurVote"), { description: t(cleErreur(e)) });
    } finally {
      setEnCours(false);
    }
  };

  return { vote, voter, enCours };
}

/** Favori ⭐ (watchlist) avec mise à jour optimiste. */
export function useFavori(datasetId: string) {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const clientRequetes = useQueryClient();
  const inviterConnexion = useInviterConnexion();
  const { data: favoris } = useMesFavoris();
  const [enCours, setEnCours] = useState(false);
  const suivi = favoris?.includes(datasetId) ?? false;

  const basculer = async () => {
    if (!utilisateur) return inviterConnexion();
    if (enCours) return;
    const cleFavoris = ["mes-favoris", utilisateur.id];
    const suivre = !(clientRequetes.getQueryData<string[]>(cleFavoris) ?? []).includes(datasetId);

    setEnCours(true);
    const annulerCompteurs = ajusterCompteurs(clientRequetes, datasetId, (c) => ({ nb_favoris: Math.max(0, c.nb_favoris + (suivre ? 1 : -1)) }));
    clientRequetes.setQueryData<string[]>(cleFavoris, (precedents = []) =>
      suivre ? [...precedents, datasetId] : precedents.filter((id) => id !== datasetId)
    );
    try {
      await changerFavori(datasetId, suivre);
      // La page /favorites se recharge pour ajouter ou retirer la carte.
      clientRequetes.invalidateQueries({ queryKey: ["favoris", utilisateur.id] });
      toast.success(t(suivre ? "communaute.favoriAjoute" : "communaute.favoriRetire"));
    } catch (e) {
      annulerCompteurs();
      clientRequetes.invalidateQueries({ queryKey: cleFavoris });
      toast.error(t("communaute.erreurFavori"), { description: t(cleErreur(e)) });
    } finally {
      setEnCours(false);
    }
  };

  return { suivi, basculer, enCours };
}
