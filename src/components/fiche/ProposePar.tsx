import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AvatarMembre } from "@/components/AvatarMembre";
import { chargerProposeur } from "@/lib/contributions";
import { routes } from "@/lib/routes";

/**
 * « Proposée par [photo] Nom » : l'auteur de la proposition qui a créé cette donnée, lien vers sa page publique.
 * Rien n'est affiché si la donnée ne vient pas d'une proposition (import, synchro, ajout d'un admin).
 */
export const ProposePar = ({ datasetId }: { datasetId: string }) => {
  const { t } = useTranslation();
  const { data: proposeur } = useQuery({
    queryKey: ["proposeur", datasetId],
    queryFn: () => chargerProposeur(datasetId),
    staleTime: 10 * 60 * 1000,
  });
  if (!proposeur) return null;
  const nom = proposeur.nom_affiche || proposeur.pseudo;

  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>{t("fiche.proposePar")}</span>
      <Link
        to={routes.membre(proposeur.pseudo)}
        className="group inline-flex min-w-0 items-center gap-2 rounded-full border border-gray-200 bg-white/80 py-0.5 pe-3 ps-0.5 font-medium text-gray-900 transition-colors hover:border-emerald-500/60 hover:text-emerald-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:text-emerald-300"
      >
        <AvatarMembre profil={proposeur} className="h-6 w-6 text-[10px]" />
        <span className="truncate" dir="auto">
          {nom}
        </span>
      </Link>
    </p>
  );
};
