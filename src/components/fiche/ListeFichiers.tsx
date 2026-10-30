import { Download, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formaterTaille, grouperFichiers } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Fichier, Ressource } from "@/lib/types";
import { IconeFormat } from "./BadgeFormat";
import { DialogueTelechargement } from "./DialogueTelechargement";

/**
 * Une ligne par fichier : ses formats d'origine et leur taille, et un bouton « Télécharger » qui ouvre le même
 * dialogue que l'en-tête de la fiche, sur ce fichier (choix du format, conversions comprises).
 */
export const ListeFichiers = ({ fichiers, ressources }: { fichiers: Fichier[]; ressources: Ressource[] }) => {
  const { t } = useTranslation();
  const langue = useLangue();

  if (fichiers.length === 0) {
    return <p className="text-muted-foreground">{t("fiche.aucunFichier")}</p>;
  }

  return (
    <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">
      {grouperFichiers(fichiers).map((groupe) => {
        const ressource = ressources.find((element) => element.nom.toLowerCase() === groupe.cle);
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
      })}
    </ul>
  );
};
