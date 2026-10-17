import { Link } from "react-router-dom";
import { Database, Scale, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { texteTraduit } from "@/lib/traduction";
import { formaterNombre } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { ResumeDonnee, TexteMultilingue } from "@/lib/types";

interface CarteDonneeProps {
  donnee: ResumeDonnee;
  nomCategorie?: TexteMultilingue;
}

export function CarteDonnee({ donnee, nomCategorie }: CarteDonneeProps) {
  const { t } = useTranslation();
  const langue = useLangue();
  const nbLignes = donnee.versions?.nb_lignes;
  const description = texteTraduit(donnee.description, langue);

  return (
    <Link to={`/donnees/${donnee.slug}`} className="block w-full h-full">
      <Card className="relative group hover:shadow-lg transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 h-full flex flex-col">
        <BorderBeam
          size={300}
          duration={20}
          colorFrom="#1a365d"
          colorTo="#10b981"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <CardHeader className="pb-3">
          {nomCategorie && (
            <Badge variant="secondary" className="w-fit mb-2">
              {texteTraduit(nomCategorie, langue)}
            </Badge>
          )}
          <CardTitle className="text-lg font-semibold leading-snug">
            {texteTraduit(donnee.titre, langue)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{description}</p>
          )}
          <dl className="mt-auto grid gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            {nbLignes !== null && nbLignes !== undefined && (
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 shrink-0" aria-hidden />
                <dt className="sr-only">{t("fiche.lignes")}</dt>
                <dd>{t("catalogue.lignes", { count: nbLignes, nombre: formaterNombre(nbLignes, langue) })}</dd>
              </div>
            )}
            {donnee.sources?.nom && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 shrink-0" aria-hidden />
                <dt className="sr-only">{t("catalogue.source")}</dt>
                <dd className="truncate">{donnee.sources.nom}</dd>
              </div>
            )}
            {donnee.licence_code && (
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 shrink-0" aria-hidden />
                <dt className="sr-only">{t("catalogue.licence")}</dt>
                <dd dir="ltr">{donnee.licence_code}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CarteDonneeSquelette() {
  return (
    <Card className="h-full bg-white dark:bg-gray-800">
      <CardHeader className="pb-3 space-y-3">
        <div className="h-5 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-muted animate-pulse mt-4" />
      </CardContent>
    </Card>
  );
}
