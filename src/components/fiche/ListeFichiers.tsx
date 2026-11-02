import { useState } from "react";
import { Download, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formaterTaille, grouperFichiers, sourcesDesFichiers, type GroupeFichiers } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Fichier, Ressource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconeFormat } from "./BadgeFormat";
import { DialogueTelechargement } from "./DialogueTelechargement";
import { MentionSource } from "./MentionSource";

const TOUTES = "toutes";

/**
 * Une ligne par fichier : ses formats d'origine et leur taille, et un bouton « Télécharger » qui ouvre le même
 * dialogue que l'en-tête de la fiche, sur ce fichier (choix du format, conversions comprises).
 * Fichiers de plusieurs sources (ex. GeoAlgeria et OpenStreetMap) : un sélecteur de source, puis une section par
 * source avec sa mention (licence, attribution OpenStreetMap).
 */
export const ListeFichiers = ({ fichiers, ressources, slug }: { fichiers: Fichier[]; ressources: Ressource[]; slug: string }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [choix, setChoix] = useState(TOUTES);

  if (fichiers.length === 0) {
    return <p className="text-muted-foreground">{t("fiche.aucunFichier")}</p>;
  }

  const groupes = grouperFichiers(fichiers);
  const ressourceDe = (groupe: GroupeFichiers) => ressources.find((element) => element.nom.toLowerCase() === groupe.cle);
  const sources = sourcesDesFichiers(ressources);
  const plusieursSources = sources.length > 1;

  const ligne = (groupe: GroupeFichiers) => {
    const ressource = ressourceDe(groupe);
    return (
      <li key={groupe.cle} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
        <IconeFormat format={groupe.fichiers[0].format} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate font-semibold" dir="ltr">
              {groupe.nom}
            </span>
            {groupe.principal && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Star className="h-3 w-3" aria-hidden />
                {t("fiche.principal")}
              </Badge>
            )}
          </p>
          {/* Formats d'origine et taille : simple information, le choix du format se fait dans le dialogue. */}
          <p className="text-xs text-muted-foreground" dir="ltr">
            {groupe.fichiers
              .map((fichier) =>
                [fichier.format === "geojson" ? "GeoJSON" : fichier.format.toUpperCase(), fichier.taille_octets !== null ? formaterTaille(fichier.taille_octets, langue) : null]
                  .filter(Boolean)
                  .join(" ")
              )
              .join(" · ")}
          </p>
        </div>
        {ressource && (
          <DialogueTelechargement
            ressources={ressources}
            slug={slug}
            apercu
            nomInitial={ressource.nom}
            declencheur={
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 border-emerald-700/40 text-emerald-800 hover:bg-emerald-50 sm:w-auto dark:border-emerald-400/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                aria-label={t("fiche.telechargerFichier", { nom: groupe.nom })}
              >
                <Download className="h-4 w-4" aria-hidden />
                {t("fiche.telecharger")}
              </Button>
            }
          />
        )}
      </li>
    );
  };

  if (!plusieursSources) {
    return (
      <div className="space-y-2">
        <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">{groupes.map(ligne)}</ul>
        {sources[0]?.slug === "openstreetmap" && <MentionSource source={sources[0]} />}
      </div>
    );
  }

  const visibles = choix === TOUTES ? sources : sources.filter((source) => source.slug === choix);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{t("fiche.sources.aide")}</p>
        <div role="group" aria-label={t("fiche.sources.choisir")} className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/10">
          {[{ slug: TOUTES, nom: t("fiche.sources.toutes") }, ...sources].map((source) => (
            <button
              key={source.slug}
              type="button"
              onClick={() => setChoix(source.slug)}
              aria-pressed={choix === source.slug}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                choix === source.slug
                  ? "bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-600/30 dark:bg-gray-900 dark:text-emerald-300"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              )}
            >
              {source.nom}
            </button>
          ))}
        </div>
      </div>
      {visibles.map((source) => {
        const groupesSource = groupes.filter((groupe) => (ressourceDe(groupe)?.source?.slug ?? null) === source.slug);
        if (groupesSource.length === 0) return null;
        return (
          <section key={source.slug} className="space-y-2" aria-label={source.nom}>
            <h3 className="text-sm font-semibold">{t("fiche.sources.titre", { source: source.nom })}</h3>
            <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">{groupesSource.map(ligne)}</ul>
            <MentionSource source={source} licence={ressources.find((ressource) => ressource.source?.slug === source.slug)?.licence_code} />
          </section>
        );
      })}
    </div>
  );
};
