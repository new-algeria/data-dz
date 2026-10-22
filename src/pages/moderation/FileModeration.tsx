import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronRight, Database, FileStack, Inbox } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { AvatarMembre } from "@/components/AvatarMembre";
import { EtatErreur } from "@/components/EtatErreur";
import { BadgeStatut } from "@/components/propositions/BadgeStatut";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLangue } from "@/hooks/use-langue";
import { cleErreur } from "@/lib/erreurs";
import { localeNombres } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import { chargerFileModeration, compterParStatut, STATUTS_SOUMISSION, type StatutSoumission } from "@/lib/soumissions";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

const estStatut = (valeur: string | null): valeur is StatutSoumission => STATUTS_SOUMISSION.includes(valeur as StatutSoumission);

const FileModeration = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [parametres, setParametres] = useSearchParams();
  const brut = parametres.get("status");
  const statut: StatutSoumission = estStatut(brut) ? brut : "en_attente";

  const comptes = useQuery({ queryKey: ["moderation", "comptes"], queryFn: compterParStatut });
  const file = useQuery({ queryKey: ["moderation", "file", statut], queryFn: () => chargerFileModeration(statut) });
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium", timeStyle: "short" });

  const choisir = (nouveau: StatutSoumission) =>
    setParametres(nouveau === "en_attente" ? {} : { status: nouveau }, { replace: true });

  return (
    <MiseEnPage
      titre={t("moderation.titre")}
      sousTitre={t("moderation.sousTitre")}
      chemin={routes.moderation}
      largeur="large"
      actions={
        <Button asChild variant="outline" className="gap-2">
          <Link to={routes.moderationDatasets}>
            <Database className="h-4 w-4" />
            {t("moderation.datasets.lien")}
          </Link>
        </Button>
      }
    >
      <div role="tablist" aria-label={t("moderation.filtrerStatut")} className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {STATUTS_SOUMISSION.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === statut}
            onClick={() => choisir(s)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              s === statut
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-500/60 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200"
            )}
          >
            {t(`propositions.statuts.${s}`)}
            <span
              className={cn(
                "min-w-[1.5rem] rounded-full px-1.5 text-center text-xs tabular-nums",
                s === statut ? "bg-white/20" : "bg-gray-100 dark:bg-white/10"
              )}
            >
              {comptes.data ? comptes.data[s] : "·"}
            </span>
          </button>
        ))}
      </div>

      {statut === "acceptee" && (
        <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
          {t("moderation.aideAcceptees")}
        </p>
      )}

      {file.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : file.isError ? (
        <EtatErreur message={t(cleErreur(file.error))} onReessayer={() => file.refetch()} />
      ) : file.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-white px-4 py-14 text-center dark:bg-gray-800">
          <Inbox className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">{t("moderation.fileVide")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {file.data.map((soumission) => (
            <li key={soumission.id}>
              <Link
                to={routes.moderationProposition(soumission.id)}
                className="group flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md dark:border-white/10 dark:bg-gray-800"
              >
                {soumission.auteur && <AvatarMembre profil={soumission.auteur} className="hidden h-10 w-10 sm:flex" />}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeStatut statut={soumission.statut} />
                    <span className="text-xs text-muted-foreground">{t(`propositions.types.${soumission.type}`)}</span>
                    {soumission.dataset && (
                      <span className="truncate text-xs text-muted-foreground">→ {texteTraduit(soumission.dataset.titre, langue)}</span>
                    )}
                  </div>
                  <p className="truncate font-semibold">{texteTraduit(soumission.titre, langue)}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {soumission.auteur && <span dir="ltr">@{soumission.auteur.pseudo}</span>}
                    <time dateTime={soumission.cree_le}>{formatDate.format(new Date(soumission.cree_le))}</time>
                    <span className="inline-flex items-center gap-1">
                      <FileStack className="h-3.5 w-3.5" aria-hidden />
                      {t("propositions.nbFichiers", { count: soumission.fichiers.length })}
                    </span>
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MiseEnPage>
  );
};

export default FileModeration;
