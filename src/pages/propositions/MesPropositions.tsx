import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileStack, Inbox, Plus } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { BadgeStatut } from "@/components/propositions/BadgeStatut";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { cleErreur } from "@/lib/erreurs";
import { localeNombres } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import { chargerMesSoumissions, LIMITE_SOUMISSIONS_EN_COURS, STATUTS_MODIFIABLES } from "@/lib/soumissions";
import { texteTraduit } from "@/lib/traduction";

const MesPropositions = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { utilisateur } = useAuth();
  const requete = useQuery({
    queryKey: ["mes-soumissions", utilisateur?.id],
    queryFn: () => chargerMesSoumissions(utilisateur!.id),
    enabled: Boolean(utilisateur),
  });
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium" });
  const enCours = requete.data?.filter((s) => STATUTS_MODIFIABLES.includes(s.statut)).length ?? 0;

  return (
    <MiseEnPage
      titre={t("propositions.mesTitre")}
      sousTitre={t("propositions.mesSousTitre")}
      chemin={routes.mesPropositions}
      actions={
        <Button asChild className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
          <Link to={routes.proposer}>
            <Plus className="h-4 w-4" />
            {t("navbar.proposer")}
          </Link>
        </Button>
      }
    >
      {requete.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : requete.isError ? (
        <MessageAuth type="erreur">{t(cleErreur(requete.error))}</MessageAuth>
      ) : requete.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-white px-4 py-16 text-center dark:bg-gray-800">
          <Inbox className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="font-medium">{t("propositions.aucuneProposition")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("propositions.aucunePropositionTexte")}</p>
          <Button asChild className="mt-2 bg-emerald-700 text-white hover:bg-emerald-800">
            <Link to={routes.proposer}>{t("navbar.proposer")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("propositions.compteurEnCours", { nombre: enCours, max: LIMITE_SOUMISSIONS_EN_COURS })}
          </p>
          <ul className="space-y-3">
            {requete.data.map((soumission) => (
              <li key={soumission.id}>
                <Link
                  to={routes.maProposition(soumission.id)}
                  className="group flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md dark:border-white/10 dark:bg-gray-800"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <BadgeStatut statut={soumission.statut} />
                      <span className="text-xs text-muted-foreground">{t(`propositions.types.${soumission.type}`)}</span>
                    </div>
                    <p className="truncate font-semibold">{texteTraduit(soumission.titre, langue)}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <time dateTime={soumission.cree_le}>{t("propositions.envoyeeLe", { date: formatDate.format(new Date(soumission.cree_le)) })}</time>
                      <span className="inline-flex items-center gap-1">
                        <FileStack className="h-3.5 w-3.5" aria-hidden />
                        {t("propositions.nbFichiers", { count: soumission.fichiers.length })}
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </MiseEnPage>
  );
};

export default MesPropositions;
