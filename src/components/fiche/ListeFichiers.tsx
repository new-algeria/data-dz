import { Download, FileJson, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formaterTaille, trierFichiers, urlFichier } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Fichier } from "@/lib/types";

function nomAffiche(fichier: Fichier): string {
  return fichier.nom ?? fichier.cle_stockage.split("/").pop() ?? fichier.cle_stockage;
}

export const ListeFichiers = ({ fichiers }: { fichiers: Fichier[] }) => {
  const { t } = useTranslation();
  const langue = useLangue();

  if (fichiers.length === 0) {
    return <p className="text-muted-foreground">{t("fiche.aucunFichier")}</p>;
  }

  return (
    <ul className="divide-y rounded-md border bg-white dark:bg-gray-900">
      {trierFichiers(fichiers).map((fichier) => (
        <li key={fichier.cle_stockage} className="flex flex-wrap items-center gap-3 p-3">
          <FileJson className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" dir="ltr">
              {nomAffiche(fichier)}
            </p>
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
              <span className="uppercase font-mono">{fichier.format}</span>
              {fichier.taille_octets !== null && <span>{formaterTaille(fichier.taille_octets, langue)}</span>}
            </p>
          </div>
          {fichier.principal && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" aria-hidden />
              {t("fiche.principal")}
            </Badge>
          )}
          <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white">
            <a href={urlFichier(fichier.cle_stockage)} download target="_blank" rel="noopener noreferrer">
              <Download />
              {t("fiche.telecharger")}
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
};
