import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { apparenceCategorie } from "@/lib/apparence";
import { catalogueParCategorie, routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import type { Thematique } from "@/lib/thematiques";
import { useLangue } from "@/hooks/use-langue";
import { cn } from "@/lib/utils";

/**
 * Carte d'une thématique : icône aux couleurs de la catégorie, nom, nombre de données ; mène au catalogue filtré.
 * `detaillee` (page des thématiques) ajoute quelques données de la catégorie.
 */
export const CarteThematique = ({
  thematique,
  detaillee = false,
  copie = false,
  className,
}: {
  thematique: Thematique;
  detaillee?: boolean;
  /** Copie qui sert à boucler le défilement : hors tabulation (elle est aussi masquée aux lecteurs d'écran). */
  copie?: boolean;
  className?: string;
}) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { categorie, nb, exemples } = thematique;
  const { icone: Icone, couleurs } = apparenceCategorie(categorie.icone);
  const nom = texteTraduit(categorie.nom, langue);

  const entete = (
    <>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", couleurs)} aria-hidden>
        <Icone className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-gray-900 dark:text-white">{nom}</span>
        <span className="block truncate text-sm text-muted-foreground">{t("thematiques.nbDonnees", { count: nb })}</span>
      </span>
    </>
  );

  if (!detaillee) {
    return (
      <Link
        to={catalogueParCategorie(categorie.slug)}
        tabIndex={copie ? -1 : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-gray-900",
          className
        )}
      >
        {entete}
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" aria-hidden />
      </Link>
    );
  }

  return (
    <article className={cn("flex flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900", className)}>
      <div className="flex items-center gap-3">{entete}</div>
      {exemples.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t pt-3 text-sm">
          {exemples.map((donnee) => (
            <li key={donnee.slug}>
              <Link to={routes.donnee(donnee.slug)} className="block truncate text-gray-700 hover:text-emerald-700 hover:underline dark:text-gray-300 dark:hover:text-emerald-400">
                {texteTraduit(donnee.titre, langue)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to={catalogueParCategorie(categorie.slug)}
        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
      >
        {t("thematiques.voirDonnees", { count: nb })}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </Link>
    </article>
  );
};

export const CarteThematiqueSquelette = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 dark:border-white/10 dark:bg-gray-900", className)}>
    <Skeleton className="h-11 w-11 rounded-xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);
