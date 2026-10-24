import { CheckCircle2, FilePenLine, MessageSquare, PencilLine, XCircle, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AvatarMembre } from "@/components/AvatarMembre";
import { useLangue } from "@/hooks/use-langue";
import { localeNombres } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import type { DecisionRevue, Revue } from "@/lib/soumissions";
import { cn } from "@/lib/utils";

const icones: Record<DecisionRevue, { icone: LucideIcon; couleur: string }> = {
  commentaire: { icone: MessageSquare, couleur: "text-sky-600 dark:text-sky-400" },
  modifications_demandees: { icone: PencilLine, couleur: "text-amber-600 dark:text-amber-400" },
  acceptee: { icone: CheckCircle2, couleur: "text-emerald-600 dark:text-emerald-400" },
  refusee: { icone: XCircle, couleur: "text-red-600 dark:text-red-400" },
  modification: { icone: FilePenLine, couleur: "text-violet-600 dark:text-violet-400" },
};

export const HistoriqueRevues = ({ revues }: { revues: Revue[] }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium", timeStyle: "short" });

  if (revues.length === 0) return <p className="text-sm text-muted-foreground">{t("propositions.detail.aucuneRevue")}</p>;

  return (
    <ol className="space-y-4">
      {revues.map((revue) => {
        const { icone: Icone, couleur } = icones[revue.decision] ?? icones.commentaire;
        return (
          <li key={revue.id} className="flex gap-3">
            <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10", couleur)}>
              <Icone className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{t(`propositions.decisions.${revue.decision}`)}</span>
                {revue.relecteur && (
                  <Link to={routes.membre(revue.relecteur.pseudo)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:underline">
                    <AvatarMembre profil={revue.relecteur} className="h-5 w-5 text-[9px]" />
                    {revue.relecteur.nom_affiche || revue.relecteur.pseudo}
                  </Link>
                )}
                <time className="text-xs text-muted-foreground" dateTime={revue.cree_le}>
                  {formatDate.format(new Date(revue.cree_le))}
                </time>
              </p>
              {revue.commentaire && (
                <p className="mt-1.5 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-200" dir="auto">
                  {revue.commentaire}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
