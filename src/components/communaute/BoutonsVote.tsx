import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexte/ContexteAuth";
import { useVote } from "@/hooks/use-communaute";
import { useLangue } from "@/hooks/use-langue";
import { formaterNombre } from "@/lib/fichiers";
import type { CompteursDonnee } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BoutonsVoteProps {
  donnee: CompteursDonnee;
  taille?: "petite" | "grande";
  className?: string;
}

/** 👍 / 👎 avec le score : un clic vote, un second clic retire le vote, l'autre bouton le change. */
export const BoutonsVote = ({ donnee, taille = "petite", className }: BoutonsVoteProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { utilisateur } = useAuth();
  const { vote, voter, enCours } = useVote(donnee.id);
  const grande = taille === "grande";
  const score = donnee.score;

  const bouton = (valeur: 1 | -1) => {
    const actif = vote === valeur;
    const Icone = valeur === 1 ? ThumbsUp : ThumbsDown;
    const nombre = valeur === 1 ? donnee.nb_votes_pour : donnee.nb_votes_contre;
    const libelle = !utilisateur
      ? t("communaute.connexionPourVoter")
      : actif
        ? t("communaute.retirerVote")
        : t(valeur === 1 ? "communaute.voterPour" : "communaute.voterContre");
    return (
      <button
        type="button"
        onClick={() => voter(valeur)}
        disabled={enCours}
        aria-pressed={utilisateur ? actif : undefined}
        aria-label={`${libelle} (${formaterNombre(nombre, langue)})`}
        title={libelle}
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-wait",
          grande ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs",
          actif
            ? valeur === 1
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
            : "text-muted-foreground hover:bg-gray-100 hover:text-foreground dark:hover:bg-white/10"
        )}
      >
        <Icone className={cn(grande ? "h-4 w-4" : "h-3.5 w-3.5", actif && "fill-current")} aria-hidden />
        {formaterNombre(nombre, langue)}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={t("communaute.votes")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white/80 p-0.5 dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      {bouton(1)}
      <span
        className={cn(
          "min-w-[2ch] px-1 text-center font-bold tabular-nums",
          grande ? "text-base" : "text-sm",
          score > 0 ? "text-emerald-700 dark:text-emerald-400" : score < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"
        )}
        title={t("communaute.score")}
        dir="ltr"
      >
        <span className="sr-only">{t("communaute.score")} : </span>
        {score > 0 ? "+" : ""}
        {formaterNombre(score, langue)}
      </span>
      {bouton(-1)}
    </div>
  );
};
