import { Download, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formaterTaille, grouperFichiers, urlFichier } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import { cn } from "@/lib/utils";
import type { Fichier } from "@/lib/types";
import { IconeFormat } from "./BadgeFormat";

/** Une ligne par fichier ; ses différents formats (GeoJSON, JSON, CSV…) ont chacun leur bouton de téléchargement. */
export const ListeFichiers = ({ fichiers }: { fichiers: Fichier[] }) => {
  const { t } = useTranslation();
  const langue = useLangue();

  if (fichiers.length === 0) {
    return <p className="text-muted-foreground">{t("fiche.aucunFichier")}</p>;
  }

  return (
    <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">
      {grouperFichiers(fichiers).map((groupe) => (
        <li key={groupe.cle} className="space-y-3 p-3">
          <div className="flex items-center gap-3">
            <IconeFormat format={groupe.fichiers[0].format} />
            <p className="min-w-0 flex-1 truncate font-semibold" dir="ltr">
              {groupe.nom}
            </p>
            {groupe.principal && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Star className="h-3 w-3" aria-hidden />
                {t("fiche.principal")}
              </Badge>
            )}
          </div>
          <div className={cn("grid gap-2", groupe.fichiers.length > 1 ? "grid-cols-2 sm:flex sm:flex-wrap" : "sm:flex")}>
            {groupe.fichiers.map((fichier, indice) => (
              <Button
                key={fichier.cle_stockage}
                asChild
                size="sm"
                variant={indice === 0 ? "default" : "outline"}
                className={cn(
                  "h-auto min-h-9 justify-center gap-2 py-1.5",
                  indice === 0
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : "border-emerald-700/40 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                )}
              >
                <a
                  href={urlFichier(fichier.cle_stockage)}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("fiche.telechargerFormat", { nom: groupe.nom, format: fichier.format.toUpperCase() })}
                >
                  <Download aria-hidden />
                  {/* Taille sous le format sur mobile, à côté sur grand écran : rien n'est coupé */}
                  <span className="flex flex-col items-start leading-tight sm:flex-row sm:items-baseline sm:gap-2">
                    <span className="font-semibold" dir="ltr">
                      {fichier.format.toUpperCase()}
                    </span>
                    {fichier.taille_octets !== null && <span className="text-xs font-normal opacity-80">{formaterTaille(fichier.taille_octets, langue)}</span>}
                  </span>
                </a>
              </Button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
};
