import { useMemo } from "react";
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#020817]">
      <CustomMetaTags title={`${t("ressourcesIA.titre")} - data-dz`} description={t("ressourcesIA.metaDescription")} path={routes.donneesIA} />
      <Navbar />

      <header className="bg-gradient-to-b from-emerald-50 via-white to-gray-50 pt-24 dark:from-[#03140f] dark:via-[#020817] dark:to-[#020817]">
        <div className="container mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 pb-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              <GraduationCap className="h-4 w-4" aria-hidden />
              {t("ressourcesIA.badgeHero")}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              {t("ressourcesIA.heroTitre")} <span className="text-emerald-700 dark:text-emerald-400">{t("ressourcesIA.heroSurligne")}</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">{t("ressourcesIA.heroTexte")}</p>
          </div>
          <img src="/mascotte/fennec.webp" alt="" aria-hidden width={241} height={332} className="hidden h-40 w-auto drop-shadow-md md:block" />
        </div>
      </header>

      {/* Domaines : rangée défilable, collée sous l'en-tête du site pendant le défilement */}
      <nav aria-label={t("ressourcesIA.domainesAria")} className="sticky top-16 z-20 border-b bg-gray-50/95 backdrop-blur dark:bg-[#020817]/95">
        <div className="container mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {domaines.map((domaine, indice) => (
            <a
              key={domaine.code}
              href={`#${domaine.code}`}
              className={
                indice === 0
                  ? "shrink-0 rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
                  : "shrink-0 rounded-full border bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 dark:bg-gray-900 dark:text-gray-200"
              }
            >
              {domaine.icone} {t(`ressourcesIA.domaines.${domaine.code}.nom`)}
            </a>
          ))}
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl flex-1 space-y-12 px-4 py-10">
        {domaines.map((domaine) => (
          <section key={domaine.code} id={domaine.code} className="scroll-mt-32">
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
                    : domaine.donnees.map((donnee) => (
                        <CarteDonnee
                          key={donnee.slug}
                          donnee={donnee}
                          categorie={donnee.categorie_slug ? categoriesParSlug.get(donnee.categorie_slug) : undefined}
                        />
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
                  {domaine.ressources.map((ressource) => (
                    <CarteRessourceIA key={ressource.id} ressource={ressource} />
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
          </section>
        ))}

        <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gray-900 p-7 text-white md:flex-row md:items-center dark:bg-gray-800">
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
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PageDonneesIA;
