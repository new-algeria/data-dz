import { useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GraduationCap, Scale } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { DrapeauAlgerie } from "@/components/DrapeauAlgerie";
import { Button } from "@/components/ui/button";
import { CarteDonnee, CarteDonneeSquelette } from "@/components/catalogue/CarteDonnee";
import { CarteRessourceIA } from "@/components/ressources-ia/CarteRessourceIA";
import { chargerCatalogue, chargerCategories } from "@/lib/catalogue";
import { donneesDuDomaine, DOMAINES_IA, ressourcesDuDomaine } from "@/lib/ressources-ia";
import { routes } from "@/lib/routes";

/** Données algériennes de data-dz affichées par domaine, avant les ressources mondiales. */
const DONNEES_PAR_DOMAINE = 3;

/**
 * Page « Données pour l'IA » (/ai-datasets) : par domaine (santé en premier), les données algériennes du catalogue
 * puis une sélection de ressources mondiales reconnues, hébergées par leurs auteurs (`src/lib/ressources-ia.ts`).
 */
const PageDonneesIA = () => {
  const { t } = useTranslation();
  const catalogue = useQuery({ queryKey: ["catalogue", "", null], queryFn: () => chargerCatalogue({ terme: "", categorie: null }) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const categoriesParSlug = useMemo(() => new Map((categories.data ?? []).map((categorie) => [categorie.slug, categorie])), [categories.data]);

  const domaines = useMemo(
    () =>
      DOMAINES_IA.map((domaine) => ({
        ...domaine,
        donnees: donneesDuDomaine(domaine.code, catalogue.data ?? [], DONNEES_PAR_DOMAINE),
        ressources: ressourcesDuDomaine(domaine.code),
      })).filter((domaine) => domaine.ressources.length > 0 || domaine.donnees.length > 0 || catalogue.isPending),
    [catalogue.data, catalogue.isPending]
  );

  // Domaine actif : celui qu'on vient de cliquer, puis celui qui passe en haut de l'écran pendant le défilement.
  const [actif, setActif] = useState<string>(DOMAINES_IA[0].code);
  const clicRecent = useRef(0);
  const barre = useRef<HTMLDivElement>(null);
  const codes = domaines.map((domaine) => domaine.code).join(",");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (Date.now() - clicRecent.current < 900) return; // laisser finir le défilement lancé par un clic
        const visible = entrees.filter((entree) => entree.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          setActif(visible.target.id);
          return;
        }
        // Remonté au-dessus du premier domaine (en-tête de la page) : le premier redevient actif.
        const premier = codes.split(",")[0];
        if ((document.getElementById(premier)?.getBoundingClientRect().top ?? 0) > 140) setActif(premier);
      },
      { rootMargin: "-140px 0px -55% 0px" }
    );
    codes.split(",").forEach((code) => {
      const section = document.getElementById(code);
      if (section) observateur.observe(section);
    });
    return () => observateur.disconnect();
  }, [codes]);
  // La pastille active reste visible dans la barre (défilement horizontal sur téléphone).
  useEffect(() => {
    barre.current?.querySelector<HTMLElement>(`[data-domaine="${actif}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [actif]);
  const choisir = (code: string) => {
    clicRecent.current = Date.now();
    setActif(code);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#020817]">
      <CustomMetaTags title={`${t("ressourcesIA.titre")} - data-dz`} description={t("ressourcesIA.metaDescription")} path={routes.donneesIA} />
      <Navbar />

      <header className="bg-gradient-to-b from-emerald-50 via-white to-gray-50 pt-24 dark:from-[#03140f] dark:via-[#020817] dark:to-[#020817]">
        <div className="container mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 pb-8">
          <motion.div className="max-w-2xl" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              <GraduationCap className="h-4 w-4" aria-hidden />
              {t("ressourcesIA.badgeHero")}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              {t("ressourcesIA.heroTitre")} <span className="text-emerald-700 dark:text-emerald-400">{t("ressourcesIA.heroSurligne")}</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">{t("ressourcesIA.heroTexte")}</p>
          </motion.div>
          <motion.img
            src="/mascotte/fennec.webp"
            alt=""
            aria-hidden
            width={241}
            height={332}
            className="hidden h-40 w-auto drop-shadow-md md:block"
            initial={{ opacity: 0, y: 40, rotate: -6 }}
            animate={{ opacity: 1, y: [0, -8, 0], rotate: 0 }}
            transition={{ opacity: { duration: 0.5, delay: 0.3 }, rotate: { duration: 0.6, delay: 0.3 }, y: { duration: 4, delay: 0.9, repeat: Infinity, ease: "easeInOut" } }}
          />
        </div>
      </header>

      {/* Domaines : rangée défilable, collée sous l'en-tête du site pendant le défilement */}
      <nav aria-label={t("ressourcesIA.domainesAria")} className="sticky top-16 z-20 border-b bg-gray-50/95 backdrop-blur dark:bg-[#020817]/95">
        <div ref={barre} className="container mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {domaines.map((domaine) => {
            const estActif = domaine.code === actif;
            return (
              <a
                key={domaine.code}
                href={`#${domaine.code}`}
                data-domaine={domaine.code}
                onClick={() => choisir(domaine.code)}
                aria-current={estActif ? "true" : undefined}
                className={
                  "relative isolate shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200 " +
                  (estActif
                    ? "border-transparent text-white dark:text-gray-900"
                    : "bg-white text-gray-700 hover:-translate-y-0.5 hover:border-gray-400 dark:bg-gray-900 dark:text-gray-200")
                }
              >
                {/* Fond de la pastille active : glisse d'un domaine à l'autre */}
                {estActif && (
                  <motion.span
                    layoutId="domaine-actif"
                    className="absolute inset-0 -z-10 rounded-full bg-gray-900 dark:bg-white"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">
                  {domaine.icone} {t(`ressourcesIA.domaines.${domaine.code}.nom`)}
                </span>
              </a>
            );
          })}
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl flex-1 space-y-12 px-4 py-10">
        {domaines.map((domaine) => (
          <motion.section
            key={domaine.code}
            id={domaine.code}
            className="scroll-mt-40"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <span aria-hidden>{domaine.icone}</span>
              {t(`ressourcesIA.domaines.${domaine.code}.nom`)}
            </h2>
            <p className="mt-1 text-gray-600 dark:text-gray-400">{t(`ressourcesIA.domaines.${domaine.code}.description`)}</p>

            {(catalogue.isPending || domaine.donnees.length > 0) && (
              <>
                <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  <DrapeauAlgerie className="h-3.5 w-auto rounded-sm" />
                  {t("ressourcesIA.donneesAlgeriennes")}
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {catalogue.isPending
                    ? Array.from({ length: 3 }, (_, indice) => <CarteDonneeSquelette key={indice} />)
                    : domaine.donnees.map((donnee, indice) => (
                        <Apparition key={donnee.slug} indice={indice}>
                          <CarteDonnee donnee={donnee} categorie={donnee.categorie_slug ? categoriesParSlug.get(donnee.categorie_slug) : undefined} />
                        </Apparition>
                      ))}
                </div>
              </>
            )}

            {domaine.ressources.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                  🌍 {t("ressourcesIA.ressourcesMondiales")}
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {domaine.ressources.map((ressource, indice) => (
                    <Apparition key={ressource.id} indice={indice}>
                      <CarteRessourceIA ressource={ressource} />
                    </Apparition>
                  ))}
                </div>
              </>
            )}

            {domaine.code === "sante" && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Scale className="h-5 w-5" aria-hidden />
                  {t("ressourcesIA.regles.titre")}
                </h3>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
                  <li>{t("ressourcesIA.regles.loi")}</li>
                  <li>{t("ressourcesIA.regles.chu")}</li>
                  <li>{t("ressourcesIA.regles.licence")}</li>
                  <li>{t("ressourcesIA.regles.diagnostic")}</li>
                </ul>
              </div>
            )}
          </motion.section>
        ))}

        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gray-900 p-7 text-white md:flex-row md:items-center dark:bg-gray-800">
          <div>
            <h2 className="text-2xl font-bold">{t("ressourcesIA.appel.titre")}</h2>
            <p className="mt-1 text-gray-300">{t("ressourcesIA.appel.texte")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400">
              <Link to={routes.proposer}>{t("ressourcesIA.appel.proposer")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={routes.djazai}>{t("ressourcesIA.appel.djazai")}</Link>
            </Button>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
    </MotionConfig>
  );
};

/** Carte qui apparaît en glissant vers le haut, en cascade dans sa rangée (3 par ligne). */
const Apparition = ({ indice, children }: { indice: number; children: React.ReactNode }) => (
  <motion.div
    className="h-full"
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.45, delay: (indice % 3) * 0.08, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default PageDonneesIA;
