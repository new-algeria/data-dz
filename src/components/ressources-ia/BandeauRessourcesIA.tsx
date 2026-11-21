import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Globe2 } from "lucide-react";
import type { RessourceIA } from "@/lib/ressources-ia";
import { routes } from "@/lib/routes";

/** Noms cités dans le bandeau avant « … ». */
const NOMS_CITES = 3;

interface BandeauRessourcesIAProps {
  ressources: RessourceIA[];
  /** Recherche tapée dans le catalogue (vide : seule une catégorie est choisie). */
  recherche: string;
}

/**
 * Bandeau discret du catalogue : des ressources mondiales pour l'IA correspondent à la recherche ou à la catégorie.
 * Le catalogue reste 100 % algérien ; le lien mène au bon domaine de la page /ai-datasets.
 */
export function BandeauRessourcesIA({ ressources, recherche }: BandeauRessourcesIAProps) {
  const { t } = useTranslation();
  if (ressources.length === 0) return null;
  const noms = ressources.slice(0, NOMS_CITES).map((ressource) => ressource.nom).join(", ") + (ressources.length > NOMS_CITES ? "…" : "");
  const titre = recherche
    ? t("ressourcesIA.catalogue.bandeauRecherche", { count: ressources.length, recherche })
    : t("ressourcesIA.catalogue.bandeauCategorie", { count: ressources.length });

  return (
    <Link
      to={`${routes.donneesIA}#${ressources[0].domaine}`}
      className="group mb-6 flex flex-col gap-2 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/70 px-4 py-3 text-sm transition-colors hover:border-indigo-400 hover:bg-indigo-50 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15"
    >
      <span className="flex min-w-0 items-start gap-2.5 text-indigo-950 dark:text-indigo-100">
        <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden />
        <span className="min-w-0">
          <span className="font-semibold">{titre}</span>
          <span className="text-indigo-800/80 dark:text-indigo-200/80"> · {noms}</span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
        {t("ressourcesIA.catalogue.voir")}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
