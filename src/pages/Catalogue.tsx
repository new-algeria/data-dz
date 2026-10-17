import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, Github, Search, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { EtatErreur } from "@/components/EtatErreur";
import { Statistiques } from "@/components/catalogue/Statistiques";
import { CarteDonnee, CarteDonneeSquelette } from "@/components/catalogue/CarteDonnee";
import { GlobeAccueil } from "@/components/accueil/GlobeAccueil";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chargerCatalogue, chargerCategories } from "@/lib/catalogue";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { useValeurDifferee } from "@/hooks/use-valeur-differee";
import type { TexteMultilingue } from "@/lib/types";

const TOUTES_CATEGORIES = "toutes";
const TAILLE_PAGE = 12;

const Catalogue = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [parametres, setParametres] = useSearchParams();

  // Recherche et catégorie sont gardées dans l'URL pour pouvoir partager un lien filtré.
  const categorie = parametres.get("categorie");
  const [saisie, setSaisie] = useState(parametres.get("q") ?? "");
  const terme = useValeurDifferee(saisie.trim());
  const [nbVisibles, setNbVisibles] = useState(TAILLE_PAGE);

  useEffect(() => {
    setParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        if (terme) suivants.set("q", terme);
        else suivants.delete("q");
        return suivants;
      },
      { replace: true }
    );
  }, [terme, setParametres]);

  useEffect(() => {
    setNbVisibles(TAILLE_PAGE);
  }, [terme, categorie]);

  const requeteCategories = useQuery({
    queryKey: ["categories"],
    queryFn: chargerCategories,
    staleTime: 60 * 60 * 1000,
  });

  const requeteCatalogue = useQuery({
    queryKey: ["catalogue", terme, categorie],
    queryFn: () => chargerCatalogue({ terme, categorie }),
    placeholderData: keepPreviousData,
  });

  const nomsCategories = useMemo(() => {
    const noms = new Map<string, TexteMultilingue>();
    requeteCategories.data?.forEach((cat) => noms.set(cat.slug, cat.nom));
    return noms;
  }, [requeteCategories.data]);

  const choisirCategorie = (valeur: string) => {
    setParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        if (valeur === TOUTES_CATEGORIES) suivants.delete("categorie");
        else suivants.set("categorie", valeur);
        return suivants;
      },
      { replace: true }
    );
  };

  const reinitialiser = () => {
    setSaisie("");
    setParametres({}, { replace: true });
  };

  const listeDonnees = requeteCatalogue.data ?? [];
  const filtresActifs = Boolean(terme || categorie);

  return (
    <div className="min-h-screen flex flex-col dark:bg-[#020817]">
      <CustomMetaTags title={t("accueil.metaTitre")} description={t("accueil.metaDescription")} />
      <Navbar />

      <section className="relative overflow-hidden pt-16 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-[#03140f] dark:via-[#020817] dark:to-[#020817]">
        {/* Fond animé : bulles floues aux couleurs du drapeau et grille légère. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 -start-32 h-[28rem] w-[28rem] rounded-full bg-emerald-300/40 dark:bg-emerald-600/20 blur-3xl animate-flotter" />
          <div className="absolute top-40 end-[-10rem] h-[24rem] w-[24rem] rounded-full bg-teal-200/50 dark:bg-teal-500/10 blur-3xl animate-flotter-lent" />
          <div className="absolute bottom-[-8rem] start-1/3 h-72 w-72 rounded-full bg-rose-200/40 dark:bg-rose-600/10 blur-3xl animate-flotter" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>

        <div className="relative container mx-auto px-4 py-12 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-start">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-white/70 dark:bg-white/5 backdrop-blur px-3 py-1 text-sm font-medium text-emerald-800 dark:text-emerald-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              {t("accueil.badge")}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight"
            >
              {t("accueil.titre")}{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-300 dark:to-teal-300 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] [--bg-size:200%]">
                {t("accueil.titreSurligne")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0"
            >
              {t("accueil.sousTitre")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start"
            >
              <Button asChild size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-700/25 group">
                <a href="#catalogue">
                  {t("accueil.explorer")}
                  <ArrowDown className="transition-transform group-hover:translate-y-0.5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/70 dark:bg-white/5 backdrop-blur">
                <a href="https://github.com/new-algeria/data-dz" target="_blank" rel="noopener noreferrer">
                  <Github />
                  {t("accueil.contribuer")}
                </a>
              </Button>
            </motion.div>

            <div className="mt-10 max-w-xl mx-auto lg:mx-0">
              <Statistiques />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlobeAccueil />
          </motion.div>
        </div>
      </section>

      <section id="catalogue" className="scroll-mt-16 py-14 px-4 bg-accent dark:bg-inherit flex-1">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-8 text-center"
          >
            {t("catalogue.titre")}
          </motion.h2>

          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={saisie}
                onChange={(event) => setSaisie(event.target.value)}
                placeholder={t("catalogue.recherche")}
                aria-label={t("catalogue.rechercheLabel")}
                className="ps-9 bg-white dark:bg-gray-900"
              />
            </div>
            <Select value={categorie ?? TOUTES_CATEGORIES} onValueChange={choisirCategorie}>
              <SelectTrigger className="md:w-72 bg-white dark:bg-gray-900" aria-label={t("catalogue.categorie")}>
                <SelectValue placeholder={t("catalogue.categorie")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUTES_CATEGORIES}>{t("catalogue.toutesCategories")}</SelectItem>
                {requeteCategories.data?.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    {texteTraduit(cat.nom, langue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requeteCatalogue.isError ? (
            <EtatErreur message={t("catalogue.erreur")} onReessayer={() => requeteCatalogue.refetch()} />
          ) : requeteCatalogue.isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
              {Array.from({ length: 6 }, (_, indice) => (
                <CarteDonneeSquelette key={indice} />
              ))}
            </div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4" aria-live="polite">
                {t("catalogue.resultats", { count: listeDonnees.length })}
              </p>

              {listeDonnees.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-3 py-16">
                  <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden />
                  <p className="text-lg font-medium">{t("catalogue.aucunResultat")}</p>
                  <p className="text-muted-foreground">{t("catalogue.aucunResultatAide")}</p>
                  {filtresActifs && (
                    <Button variant="outline" onClick={reinitialiser}>
                      {t("catalogue.reinitialiser")}
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${
                    requeteCatalogue.isPlaceholderData ? "opacity-60" : ""
                  }`}
                >
                  {listeDonnees.slice(0, nbVisibles).map((donnee, indice) => (
                    <motion.div
                      key={donnee.slug}
                      initial={{ opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.45, delay: (indice % 3) * 0.08, ease: "easeOut" }}
                    >
                      <CarteDonnee
                        donnee={donnee}
                        nomCategorie={donnee.categorie_slug ? nomsCategories.get(donnee.categorie_slug) : undefined}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {nbVisibles < listeDonnees.length && (
                <div className="flex justify-center mt-8">
                  <Button onClick={() => setNbVisibles((nombre) => nombre + TAILLE_PAGE)}>
                    {t("catalogue.afficherPlus")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Catalogue;
