import { Link } from "react-router-dom";
import { Database, Scale, Building2, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCategorie } from "@/components/BadgeCategorie";
import { BorderBeam } from "@/components/ui/border-beam";
import { BoutonsVote } from "@/components/communaute/BoutonsVote";
import { BoutonFavori } from "@/components/communaute/BoutonFavori";
import { urlIllustration } from "@/lib/illustrations";
import { texteTraduit } from "@/lib/traduction";
import { formaterNombre } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Categorie, ResumeDonnee } from "@/lib/types";
import { routes } from "@/lib/routes";

interface CarteDonneeProps {
  donnee: ResumeDonnee;
  categorie?: Categorie;
}

export function CarteDonnee({ donnee, categorie }: CarteDonneeProps) {
  const { t } = useTranslation();
  const langue = useLangue();
  const nbLignes = donnee.versions?.nb_lignes;
  const description = texteTraduit(donnee.description, langue);

  return (
    // Le lien du titre couvre toute la carte (after:inset-0) ; les boutons de vote et de favori passent au-dessus.
    <div className="relative h-full w-full">
      {/* isolate : l'illustration (-z-10) passe au-dessus du fond de la carte mais sous son contenu. */}
      <Card className="relative isolate group focus-within:ring-2 focus-within:ring-emerald-500 hover:shadow-xl hover:shadow-emerald-900/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 h-full flex flex-col">
        <BorderBeam
          size={300}
          duration={20}
          colorFrom="#1a365d"
          colorTo="#10b981"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <img
          src={urlIllustration(donnee, "petite")}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="pointer-events-none absolute -top-2 end-0 -z-10 h-32 w-52 object-cover opacity-40 transition-opacity duration-300 [mask-image:radial-gradient(ellipse_at_top_right,black_35%,transparent_75%)] rtl:[mask-image:radial-gradient(ellipse_at_top_left,black_35%,transparent_75%)] brightness-110 group-hover:opacity-60 dark:opacity-25 dark:brightness-95 dark:group-hover:opacity-40"
        />
        <CardHeader className="pb-3">
          {categorie && <BadgeCategorie nom={categorie.nom} icone={categorie.icone} className="mb-2" />}
          <CardTitle className="text-lg font-semibold leading-snug">
            <Link to={routes.donnee(donnee.slug)} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
              {texteTraduit(donnee.titre, langue)}
            </Link>
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
          <div className="relative z-10 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
            <BoutonsVote donnee={donnee} />
            <BoutonFavori donnee={donnee} />
            {donnee.nb_commentaires > 0 && (
              <Link
                to={`${routes.donnee(donnee.slug)}#comments`}
                className="ms-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                aria-label={t("communaute.nbCommentaires", { count: donnee.nb_commentaires, nombre: formaterNombre(donnee.nb_commentaires, langue) })}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                {formaterNombre(donnee.nb_commentaires, langue)}
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
