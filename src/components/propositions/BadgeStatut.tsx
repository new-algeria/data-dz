import { CheckCircle2, CircleSlash, Clock3, PencilLine, Rocket, Undo2, XCircle, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { StatutSoumission } from "@/lib/soumissions";

const apparences: Record<StatutSoumission, { icone: LucideIcon; couleurs: string }> = {
  en_attente: { icone: Clock3, couleurs: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" },
  modifications_demandees: { icone: PencilLine, couleurs: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300" },
  acceptee: { icone: CheckCircle2, couleurs: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300" },
  refusee: { icone: XCircle, couleurs: "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300" },
  retiree: { icone: Undo2, couleurs: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300" },
  publiee: { icone: Rocket, couleurs: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300" },
};

export const BadgeStatut = ({ statut, className }: { statut: StatutSoumission; className?: string }) => {
  const { t } = useTranslation();
  const { icone: Icone, couleurs } = apparences[statut] ?? { icone: CircleSlash, couleurs: "" };
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", couleurs, className)}>
      <Icone className="h-3.5 w-3.5" aria-hidden />
      {t(`propositions.statuts.${statut}`)}
    </span>
  );
};

/** Explication du statut, avec la mention « En attente de mise en ligne » pour une proposition acceptée. */
export const ExplicationStatut = ({ statut }: { statut: StatutSoumission }) => {
  const { t } = useTranslation();
  const { icone: Icone, couleurs } = apparences[statut];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl p-4 text-sm", couleurs)} role="status">
      <Icone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{statut === "acceptee" ? t("propositions.enAttenteMiseEnLigne") : t(`propositions.statuts.${statut}`)}</p>
        <p className="mt-0.5 opacity-90">{t(`propositions.explications.${statut}`)}</p>
      </div>
    </div>
  );
};
