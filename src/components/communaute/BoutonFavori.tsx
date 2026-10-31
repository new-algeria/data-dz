import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexte/ContexteAuth";
import { useFavori } from "@/hooks/use-communaute";
import { useLangue } from "@/hooks/use-langue";
import { formaterNombre } from "@/lib/fichiers";
import type { CompteursDonnee } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BoutonFavoriProps {
  donnee: CompteursDonnee;
  /** « icone » : étoile ronde (coin de l'image des cartes du catalogue), avec le nombre seulement s'il dépasse 1. */
  taille?: "petite" | "grande" | "icone";
  className?: string;
}

/** ⭐ Suivre une donnée (watchlist) : on est notifié de ses nouvelles versions. */
export const BoutonFavori = ({ donnee, taille = "petite", className }: BoutonFavoriProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { utilisateur } = useAuth();
  const { suivi, basculer, enCours } = useFavori(donnee.id);
  const grande = taille === "grande";
  const icone = taille === "icone";
  // Sur les cartes, le nombre n'apparaît qu'à partir de 2 : « 1 » (souvent soi-même) n'apprend rien.
  const nombreVisible = !icone || donnee.nb_favoris > 1;
  const libelle = !utilisateur ? t("communaute.connexionPourSuivre") : suivi ? t("communaute.nePlusSuivre") : t("communaute.suivre");

  return (
    <button
      type="button"
      onClick={basculer}
      disabled={enCours}
      aria-pressed={utilisateur ? suivi : undefined}
      aria-label={!nombreVisible ? libelle : `${libelle} (${t("communaute.nbFavoris", { count: donnee.nb_favoris, nombre: formaterNombre(donnee.nb_favoris, langue) })})`}
      title={libelle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-wait",
        icone ? cn("h-9 justify-center shadow-sm backdrop-blur", nombreVisible ? "min-w-9 px-2.5 text-xs font-semibold" : "w-9") : grande ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
        icone && !suivi && "border-transparent bg-white/90 text-gray-700 hover:text-amber-600 dark:bg-gray-900/80 dark:text-gray-200",
        suivi
          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
          : "border-gray-200 bg-white/80 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      <Star className={cn(grande || icone ? "h-4 w-4" : "h-3.5 w-3.5", suivi && "fill-amber-400 text-amber-500")} aria-hidden />
      {grande && <span>{suivi ? t("communaute.suivie") : t("communaute.suivre")}</span>}
      {nombreVisible && <span>{formaterNombre(donnee.nb_favoris, langue)}</span>}
    </button>
  );
};
