import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useThematiques } from "@/hooks/use-thematiques";
import { routes } from "@/lib/routes";
import { CarteThematique, CarteThematiqueSquelette } from "./CarteThematique";

/** Nombre de thématiques montrées sur l'accueil ; les autres sont sur /themes. */
const NB_ACCUEIL = 8;

/**
 * « Explorer par thématique », entre le hero et le catalogue : les catégories les plus fournies
 * (défilement horizontal sur mobile, grille ensuite) et un lien vers la page de toutes les thématiques.
 */
export const SectionThematiques = () => {
  const { t } = useTranslation();
  const { thematiques, chargement, erreur } = useThematiques(0);
  if (erreur || (!chargement && thematiques.length === 0)) return null;

  return (
    <section aria-labelledby="titre-thematiques" className="px-4 pb-4 pt-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 id="titre-thematiques" className="text-3xl font-bold">
              {t("thematiques.titreAccueil")}
            </h2>
            <p className="mt-1 text-muted-foreground">{t("thematiques.sousTitre")}</p>
          </motion.div>
          <Button asChild variant="outline" className="hidden gap-2 rounded-full sm:inline-flex dark:bg-transparent">
            <Link to={routes.thematiques}>
              {t("thematiques.voirToutes")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </Button>
        </div>

        {/* Mobile : une rangée qui défile (cartes accrochées) ; à partir de sm : grille. */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {chargement
            ? Array.from({ length: 4 }, (_, indice) => <CarteThematiqueSquelette key={indice} className="w-64 shrink-0 snap-start sm:w-auto" />)
            : thematiques.slice(0, NB_ACCUEIL).map((thematique) => (
                <CarteThematique key={thematique.categorie.slug} thematique={thematique} className="w-64 shrink-0 snap-start sm:w-auto" />
              ))}
        </div>

        <Button asChild variant="outline" className="mt-4 w-full gap-2 rounded-full sm:hidden dark:bg-transparent">
          <Link to={routes.thematiques}>
            {t("thematiques.voirToutes")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
};
