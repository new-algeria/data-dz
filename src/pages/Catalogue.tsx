import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { EtatErreur } from "@/components/EtatErreur";
import { Statistiques } from "@/components/catalogue/Statistiques";
import { CarteDonnee, CarteDonneeSquelette } from "@/components/catalogue/CarteDonnee";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
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

      <section className="pt-16 bg-white dark:bg-[#020817]">
        <HeroHighlight containerClassName="h-auto py-16 md:py-24">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [20, -5, 0] }}
            transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
            className="text-3xl px-4 md:text-4xl lg:text-5xl font-bold text-neutral-700 dark:text-white max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto"
          >
            {t("accueil.titre")}{" "}
            <Highlight className="text-black dark:text-white">{t("accueil.titreSurligne")}</Highlight>
          </motion.h1>
          <p className="mt-6 px-4 max-w-2xl mx-auto text-center text-lg text-gray-600 dark:text-gray-400">
            {t("accueil.sousTitre")}
          </p>
        </HeroHighlight>
        <div className="pb-12">
          <Statistiques />
        </div>
      </section>

      <section className="py-10 px-4 bg-accent dark:bg-inherit flex-1">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">{t("catalogue.titre")}</h2>

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
                  {listeDonnees.slice(0, nbVisibles).map((donnee) => (
                    <motion.div
                      key={donnee.slug}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
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
