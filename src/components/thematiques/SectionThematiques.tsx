import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useThematiques } from "@/hooks/use-thematiques";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CarteThematique, CarteThematiqueSquelette } from "./CarteThematique";

/** Nombre de thématiques montrées sur l'accueil ; les autres sont sur /themes. */
const NB_ACCUEIL = 8;

/**
 * « Explorer par thématique », entre le hero et le catalogue : les catégories les plus fournies
 * (défilement automatique en boucle sur mobile, comme les sources ; grille ensuite) et un lien vers la page de toutes les thématiques.
 */
export const SectionThematiques = () => {
  const { t } = useTranslation();
  const { thematiques, chargement, erreur } = useThematiques(0);
  if (erreur || (!chargement && thematiques.length === 0)) return null;
  const visibles = thematiques.slice(0, NB_ACCUEIL);

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

        {/* Mobile : les thématiques défilent en boucle comme les sources (deux copies, sens inversé en arabe, pause au toucher).
            Avec « réduire les animations » : rangée qu'on fait défiler au doigt, sans copie. */}
        <div
          className="group -mx-4 flex gap-[var(--gap)] overflow-hidden px-4 py-1 [--gap:0.75rem] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none] sm:hidden"
          style={{ "--duration": `${Math.max(visibles.length, 4) * 4}s` } as CSSProperties}
        >
          {[false, true].map((copie) => (
            <div
              key={String(copie)}
              aria-hidden={copie || undefined}
              className={cn(
                "flex shrink-0 gap-[var(--gap)] animate-marquee rtl:animate-marquee-rtl group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-reduce:animate-none",
                copie && "motion-reduce:hidden"
              )}
            >
              {chargement
                ? Array.from({ length: 3 }, (_, indice) => <CarteThematiqueSquelette key={indice} className="w-60 shrink-0" />)
                : visibles.map((thematique) => (
                    <CarteThematique key={thematique.categorie.slug} thematique={thematique} copie={copie} className="min-w-[13rem] shrink-0" />
                  ))}
            </div>
          ))}
        </div>

        {/* À partir de sm : grille. */}
        <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {chargement
            ? Array.from({ length: 4 }, (_, indice) => <CarteThematiqueSquelette key={indice} />)
            : visibles.map((thematique) => <CarteThematique key={thematique.categorie.slug} thematique={thematique} />)}
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
