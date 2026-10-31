import { ExternalLink, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Données non redistribuables (`diffusion_restreinte`) : à la place de « Télécharger » et de l'API,
 * un lien vers le paquet npm de la source. Sans lien connu, seulement l'explication.
 */
export const ObtenirPaquet = ({ lien, taille = "lg", explication = true, className }: { lien: string | null | undefined; taille?: "lg" | "default"; explication?: boolean; className?: string }) => {
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {lien && (
        <Button asChild size={taille} className="w-fit gap-2 bg-emerald-700 text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-800">
          <a href={lien} target="_blank" rel="noopener noreferrer">
            <Package className={taille === "lg" ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
            {t("fiche.restreinte.bouton")}
            <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
          </a>
        </Button>
      )}
      {explication && <p className="max-w-md text-sm text-muted-foreground">{t("fiche.restreinte.explication")}</p>}
    </div>
  );
};
