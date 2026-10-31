import { MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVote } from "@/hooks/use-communaute";
import { cn } from "@/lib/utils";

/**
 * « Ces données vous ont-elles été utiles ? » : remplace la barre de votes du haut de la fiche.
 * Oui / Pas vraiment = vote pour / contre (un second clic le retire) ; « Commenter » mène aux commentaires.
 */
export const DonneesUtiles = ({ datasetId }: { datasetId: string }) => {
  const { t } = useTranslation();
  const { vote, voter, enCours } = useVote(datasetId);

  const commenter = () => {
    const section = document.getElementById("comments");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.querySelector("textarea")?.focus({ preventScroll: true });
  };

  const classeBouton = (actif: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-wait",
      actif
        ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-200"
        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-500/60 dark:border-white/10 dark:bg-gray-900 dark:text-gray-200"
    );

  return (
    <section aria-labelledby="titre-utile" className="rounded-2xl border border-gray-200/80 bg-white p-5 text-center shadow-sm dark:border-white/10 dark:bg-gray-800 md:p-6">
      <h2 id="titre-utile" className="text-lg font-semibold">
        {t("fiche.utile.question")}
      </h2>
      {vote !== null && <p className="mt-1 text-sm text-muted-foreground">{t("fiche.utile.merci")}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => void voter(1)} disabled={enCours} aria-pressed={vote === 1} className={classeBouton(vote === 1)}>
          <ThumbsUp className={cn("h-4 w-4", vote === 1 && "fill-current")} aria-hidden />
          {t("fiche.utile.oui")}
        </button>
        <button type="button" onClick={() => void voter(-1)} disabled={enCours} aria-pressed={vote === -1} className={classeBouton(vote === -1)}>
          <ThumbsDown className={cn("h-4 w-4", vote === -1 && "fill-current")} aria-hidden />
          {t("fiche.utile.non")}
        </button>
        <button type="button" onClick={commenter} className={classeBouton(false)}>
          <MessageSquare className="h-4 w-4" aria-hidden />
          {t("fiche.utile.commenter")}
        </button>
      </div>
    </section>
  );
};
