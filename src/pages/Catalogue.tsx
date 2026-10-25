import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, ArrowDownWideNarrow, Compass, Search, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { EtatErreur } from "@/components/EtatErreur";
import { Statistiques } from "@/components/catalogue/Statistiques";
import { CarteDonnee, CarteDonneeSquelette } from "@/components/catalogue/CarteDonnee";
import { GlobeAccueil } from "@/components/accueil/GlobeAccueil";
import { RechercheHero } from "@/components/accueil/RechercheHero";
import { IconeCategorie } from "@/components/BadgeCategorie";
import { DrapeauAlgerie } from "@/components/DrapeauAlgerie";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chargerCatalogue, chargerCategories, chargerStatistiques } from "@/lib/catalogue";
import { estTri, TRI_PAR_DEFAUT, TRIS, trierDonnees, type Tri } from "@/lib/communaute";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { useValeurDifferee } from "@/hooks/use-valeur-differee";

const TOUTES_CATEGORIES = "toutes";
const TAILLE_PAGE = 12;

const Catalogue = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [parametres, setParametres] = useSearchParams();

  // Recherche et catégorie sont gardées dans l'URL pour pouvoir partager un lien filtré.
  // « category » ; l'ancien paramètre « categorie » reste lu pour les liens déjà partagés.
  const categorie = parametres.get("category") ?? parametres.get("categorie");
  const triDemande = parametres.get("sort");
  const tri: Tri = estTri(triDemande) ? triDemande : TRI_PAR_DEFAUT;
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

  // Même clé que les tuiles de chiffres : une seule requête pour les deux.
  const { data: statistiques } = useQuery({ queryKey: ["statistiques"], queryFn: chargerStatistiques });

  const rechercherDepuisHero = (valeur: string) => {
    setSaisie(valeur);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const categoriesParSlug = useMemo(
    () => new Map((requeteCategories.data ?? []).map((cat) => [cat.slug, cat])),
    [requeteCategories.data]
  );

  const choisirCategorie = (valeur: string) => {
    setParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        suivants.delete("categorie");
        if (valeur === TOUTES_CATEGORIES) suivants.delete("category");
        else suivants.set("category", valeur);
        return suivants;
      },
      { replace: true }
    );
  };

  const choisirTri = (valeur: string) => {
    setParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        if (valeur === TRI_PAR_DEFAUT) suivants.delete("sort");
        else suivants.set("sort", valeur);
        return suivants;
      },
      { replace: true }
    );
  };

  const reinitialiser = () => {
    setSaisie("");
    // On garde le tri choisi : seuls la recherche et la catégorie sont effacées.
    setParametres(tri === TRI_PAR_DEFAUT ? {} : { sort: tri }, { replace: true });
  };

  // Tri dans le navigateur : le catalogue est chargé en entier, et l'ordre alphabétique suit la langue affichée.
  const listeDonnees = useMemo(
    () => trierDonnees(requeteCatalogue.data ?? [], tri, langue),
    [requeteCatalogue.data, tri, langue]
  );
  const filtresActifs = Boolean(terme || categorie);

  return (
    <div className="min-h-screen flex flex-col dark:bg-[#020817]">
      <CustomMetaTags title={t("accueil.metaTitre")} description={t("accueil.metaDescription")} />
      <Navbar />

      {/* Hero : toute la hauteur de l'écran (svh : barre d'adresse mobile comprise), le catalogue n'apparaît qu'au défilement. */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden pt-16 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-[#03140f] dark:via-[#020817] dark:to-[#020817]">
        {/* Fond animé : bulles floues aux couleurs du drapeau et grille légère. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 -start-32 h-[28rem] w-[28rem] rounded-full bg-emerald-300/40 dark:bg-emerald-600/20 blur-3xl animate-flotter" />
          <div className="absolute top-40 end-[-10rem] h-[24rem] w-[24rem] rounded-full bg-teal-200/50 dark:bg-teal-500/10 blur-3xl animate-flotter-lent" />
          <div className="absolute bottom-[-8rem] start-1/3 h-72 w-72 rounded-full bg-rose-200/40 dark:bg-rose-600/10 blur-3xl animate-flotter" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>

        {/* Écrans peu hauts (portables) : espacements et titre resserrés pour que tout tienne sans défiler. */}
        <div className="relative container mx-auto flex-1 px-4 py-8 md:py-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-8 lg:gap-6 items-center [@media(max-height:820px)]:py-5">
          <div className="text-center lg:text-start">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-white/70 dark:bg-white/5 backdrop-blur px-3 py-1 text-sm font-medium text-emerald-800 dark:text-emerald-300"
            >
              <DrapeauAlgerie className="h-5 w-[1.875rem]" titre={t("drapeau")} />
              {t("accueil.badge")}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-4xl md:text-5xl xl:text-[3.5rem] font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1] [@media(min-width:768px)_and_(max-height:820px)]:text-[2.6rem]"
            >
              {t("accueil.titre")}{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-300 dark:to-teal-300 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] [--bg-size:200%] underline decoration-wavy decoration-emerald-400/60 decoration-2 underline-offset-[0.2em] [text-decoration-skip-ink:none]">
                {t("accueil.titreSurligne")}
              </span>{" "}
              {t("accueil.titreFin")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-4 text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0"
            >
              {t("accueil.sousTitre")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 max-w-xl mx-auto lg:mx-0 text-start [@media(max-height:820px)]:mt-5"
            >
              <RechercheHero onRechercher={rechercherDepuisHero} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-5 flex flex-wrap gap-3 justify-center lg:justify-start"
            >
              <Button asChild size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-700/25 group">
                <a href="#catalog">
                  <Compass />
                  {statistiques ? t("accueil.explorerNombre", { count: statistiques.nbDonnees }) : t("accueil.explorer")}
                  <ArrowDown className="transition-transform group-hover:translate-y-0.5" />
                </a>
              </Button>
            </motion.div>

            <div className="mt-6 max-w-xl mx-auto lg:mx-0 [@media(max-height:820px)]:mt-5">
              <Statistiques />
            </div>
          </div>

          {/* Le globe ne dépasse jamais la hauteur disponible (écran moins l'en-tête et les marges). */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-[min(22rem,100%)] sm:max-w-[min(28rem,100%)] lg:max-w-[min(560px,100%,calc(100svh-8rem))]"
          >
            <GlobeAccueil />
          </motion.div>
        </div>
      </section>

      <section id="catalog" className="scroll-mt-16 py-14 px-4 bg-accent dark:bg-inherit flex-1">
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

          {/* Mobile : recherche sur toute la largeur, catégorie et tri côte à côte en dessous. */}
          <div className="grid grid-cols-2 gap-3 mb-6 md:flex md:flex-row">
            <div className="relative col-span-2 md:flex-1">
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
              <SelectTrigger className="min-w-0 text-start [&>span]:min-w-0 md:w-72 bg-white dark:bg-gray-900" aria-label={t("catalogue.categorie")}>
                <SelectValue placeholder={t("catalogue.categorie")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUTES_CATEGORIES}>
                  <span className="flex min-w-0 items-center gap-2">
                    <IconeCategorie icone={null} />
                    <span className="truncate">{t("catalogue.toutesCategories")}</span>
                  </span>
                </SelectItem>
                {requeteCategories.data?.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    <span className="flex min-w-0 items-center gap-2">
                      <IconeCategorie icone={cat.icone} />
                      <span className="truncate">{texteTraduit(cat.nom, langue)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tri} onValueChange={choisirTri}>
              <SelectTrigger className="min-w-0 md:w-60 bg-white dark:bg-gray-900" aria-label={t("catalogue.tri.libelle")}>
                {/* div et non span : le déclencheur force ses span directs sur une seule ligne (line-clamp). */}
                <div className="flex min-w-0 items-center gap-2 text-start">
                  <ArrowDownWideNarrow className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">
                    <SelectValue />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {TRIS.map((valeur) => (
                  <SelectItem key={valeur} value={valeur}>
                    {t(`catalogue.tri.${valeur}`)}
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
                        categorie={donnee.categorie_slug ? categoriesParSlug.get(donnee.categorie_slug) : undefined}
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
