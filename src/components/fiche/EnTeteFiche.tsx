import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, ChevronRight, Download, ExternalLink, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { BadgeCategorie } from "@/components/BadgeCategorie";
import { BoutonsVote } from "@/components/communaute/BoutonsVote";
import { BoutonFavori } from "@/components/communaute/BoutonFavori";
import { formaterNombre, formaterTaille, urlFichier } from "@/lib/fichiers";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import type { Donnee, Fichier } from "@/lib/types";
import { catalogueParCategorie, routes } from "@/lib/routes";

interface EnTeteFicheProps {
  donnee: Donnee;
  fichierPrincipal: Fichier | undefined;
}

export const EnTeteFiche = ({ donnee, fichierPrincipal }: EnTeteFicheProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const titre = texteTraduit(donnee.titre, langue);
  const description = texteTraduit(donnee.description, langue);
  const nomCategorie = donnee.categories ? texteTraduit(donnee.categories.nom, langue) : null;

  return (
    <section className="relative overflow-hidden border-b border-emerald-900/5 bg-gradient-to-b from-emerald-50 via-white to-gray-50 pt-16 dark:border-white/5 dark:from-[#03140f] dark:via-gray-900 dark:to-gray-900">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 end-[-6rem] h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl animate-flotter dark:bg-emerald-600/15" />
        <div className="absolute bottom-[-6rem] start-[-4rem] h-64 w-64 rounded-full bg-teal-200/40 blur-3xl animate-flotter-lent dark:bg-teal-500/10" />
      </div>

      <div className="relative container mx-auto px-4 pb-10 pt-6 md:pb-14">
        <nav aria-label={t("fiche.filAriane")} className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to={routes.catalogue} className="hover:text-foreground">
            {t("fiche.catalogue")}
          </Link>
          {donnee.categories && nomCategorie && (
            <>
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
              <Link to={catalogueParCategorie(donnee.categories.slug)} className="hover:text-foreground">
                {nomCategorie}
              </Link>
            </>
          )}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap items-center gap-2">
              {donnee.categories && (
                <Link to={catalogueParCategorie(donnee.categories.slug)} className="transition-opacity hover:opacity-80">
                  <BadgeCategorie nom={donnee.categories.nom} icone={donnee.categories.icone} taille="md" />
                </Link>
              )}
              {donnee.sources?.verifiee && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-800 backdrop-blur dark:bg-white/5 dark:text-emerald-300">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {t("fiche.sourceVerifiee")}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-5xl">{titre}</h1>
            {description && <p className="mt-4 max-w-3xl text-lg text-gray-600 dark:text-gray-400">{description}</p>}
            {donnee.sources && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("fiche.parSource")}{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{donnee.sources.nom}</span>
              </p>
            )}
            {donnee.mots_cles && donnee.mots_cles.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("fiche.motsCles")}>
                {donnee.mots_cles.map((motCle) => (
                  <li
                    key={motCle}
                    className="rounded-md bg-gray-900/5 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300"
                  >
                    #{motCle}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <BoutonsVote donnee={donnee} taille="grande" />
              <BoutonFavori donnee={donnee} taille="grande" />
              <a
                href="#comments"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:bg-white/5"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                {t("communaute.nbCommentaires", { count: donnee.nb_commentaires, nombre: formaterNombre(donnee.nb_commentaires, langue) })}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col gap-2 sm:flex-row lg:flex-col"
          >
            {fichierPrincipal && (
              <Button
                asChild
                size="lg"
                className="h-auto justify-start gap-3 bg-emerald-700 py-3 text-white shadow-lg shadow-emerald-700/25 hover:bg-emerald-800"
              >
                <a href={urlFichier(fichierPrincipal.cle_stockage)} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-5 w-5" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="font-semibold">
                      {t("fiche.telecharger")} {fichierPrincipal.format.toUpperCase()}
                    </span>
                    {fichierPrincipal.taille_octets !== null && (
                      <span className="text-xs font-normal opacity-80">
                        {formaterTaille(fichierPrincipal.taille_octets, langue)}
                      </span>
                    )}
                  </span>
                </a>
              </Button>
            )}
            {donnee.url_source && (
              <Button asChild size="lg" variant="outline" className="bg-white/70 backdrop-blur dark:bg-white/5">
                <a href={donnee.url_source} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  {t("fiche.voirSource")}
                </a>
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
