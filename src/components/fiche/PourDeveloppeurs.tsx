import { ChevronDown, Code2, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { URL_API } from "@/lib/api";
import { localeNombres } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Donnee, Fichier } from "@/lib/types";
import { BoutonApi } from "./BoutonApi";
import { ListeFichiers } from "./ListeFichiers";

const Ligne = ({ libelle, children }: { libelle: string; children: React.ReactNode }) => (
  <div className="grid gap-1.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
    <dt className="text-sm font-medium text-muted-foreground">{libelle}</dt>
    <dd className="min-w-0 text-sm">{children}</dd>
  </div>
);

/** « Pour les développeurs », replié par défaut : URL de l'API, formats, fichiers et leurs URL, colonnes, version. */
export const PourDeveloppeurs = ({ donnee, fichiers }: { donnee: Donnee; fichiers: Fichier[] }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const version = donnee.versions;
  const colonnes = Array.isArray(version?.colonnes) ? version.colonnes : [];
  const formats = [...new Set(donnee.ressources.flatMap((ressource) => ressource.telechargements.map((element) => element.format)))];
  const datePublication = version?.publie_le
    ? new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "long" }).format(new Date(version.publie_le))
    : null;

  return (
    <details id="developpeurs" className="group scroll-mt-24 rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-800">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-lg font-semibold md:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          <Code2 className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex-1">{t("fiche.developpeurs.titre")}</span>
        <span className="hidden text-sm font-normal text-muted-foreground sm:inline">{t("fiche.developpeurs.resume")}</span>
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <dl className="space-y-5 border-t border-gray-100 p-5 dark:border-white/10 md:p-6">
        <Ligne libelle={t("fiche.developpeurs.api")}>
          <div className="space-y-2">
            <BoutonApi slug={donnee.slug} />
            <a href={`${URL_API}/docs`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-700 hover:underline dark:text-violet-300">
              {t("fiche.developpeurs.documentation")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </Ligne>
        {formats.length > 0 && (
          <Ligne libelle={t("fiche.developpeurs.formats")}>
            <span dir="ltr">{formats.map((format) => t(`telechargement.formatsCourts.${format}`, { defaultValue: format.toUpperCase() })).join(" · ")}</span>
          </Ligne>
        )}
        <Ligne libelle={t("fiche.fichiers")}>
          <div className="space-y-3">
            <ListeFichiers fichiers={fichiers} ressources={donnee.ressources} />
            {/* URL stables de l'API (le fichier d'origine, affiché dans le navigateur) */}
            <ul className="space-y-1">
              {donnee.ressources.flatMap((ressource) =>
                ressource.fichiers.map((fichier) => (
                  <li key={`${ressource.nom}.${fichier.format}`}>
                    <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs" dir="ltr">
                      {fichier.url}
                    </code>
                  </li>
                ))
              )}
            </ul>
          </div>
        </Ligne>
        {colonnes.length > 0 && (
          <Ligne libelle={t("fiche.developpeurs.colonnes", { count: colonnes.length })}>
            <ul className="flex flex-wrap gap-1.5" dir="ltr">
              {colonnes.map((colonne) => (
                <li key={colonne.nom} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {colonne.nom}
                </li>
              ))}
            </ul>
          </Ligne>
        )}
        {version && (
          <Ligne libelle={t("fiche.version")}>
            <span dir="ltr" className="font-mono">
              v{version.numero}
            </span>
            {datePublication && <span className="text-muted-foreground"> · {t("fiche.developpeurs.publieeLe", { date: datePublication })}</span>}
          </Ligne>
        )}
      </dl>
    </details>
  );
};
