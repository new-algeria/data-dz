import { useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Braces, ChevronRight, Info, MapPin, Share2, Trophy, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { EtatErreur } from "@/components/EtatErreur";
import { DrapeauAlgerie } from "@/components/DrapeauAlgerie";
import { Skeleton } from "@/components/ui/skeleton";
import { CarteWilayas } from "@/components/wilayas/CarteWilayas";
import { useChiffresWilayas } from "@/hooks/use-wilayas";
import { useLangue } from "@/hooks/use-langue";
import { URL_API } from "@/lib/api";
import { apparenceCategorie } from "@/lib/apparence";
import { chargerCategories } from "@/lib/catalogue";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import type { Categorie } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  chiffresDeLaWilaya,
  chiffresEssentiels,
  codeDepuisIdentifiant,
  estimee,
  faitsMarquants,
  identifiantWilaya,
  NB_WILAYAS,
  nomWilaya,
  populationDeLaWilaya,
  titreSansPays,
  voisines,
  type ChiffreWilaya,
} from "@/lib/wilayas";

const formateur = (langue: string, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(langue === "ar" ? "ar-DZ" : langue, options);

/** /wilayas/:wilaya : tout ce que data-dz sait d'une wilaya, avec son rang parmi les 69. */
const PageWilaya = () => {
  const { wilaya: identifiant } = useParams();
  const { t } = useTranslation();
  const langue = useLangue();
  const naviguer = useNavigate();
  const code = codeDepuisIdentifiant(identifiant);
  const { data: chiffres, isPending, isError, refetch } = useChiffresWilayas();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });

  const wilaya = chiffres?.wilayas.find((w) => w.code === code);
  const liste = useMemo(() => (chiffres && code ? chiffresDeLaWilaya(chiffres, code) : []), [chiffres, code]);
  const population = chiffres && code ? populationDeLaWilaya(chiffres, code) : null;
  const autour = chiffres && code ? voisines(chiffres.wilayas, code) : null;

  // Une URL incomplète ou ancienne (« /wilayas/16 ») passe à l'identifiant lisible (« /wilayas/16-alger »).
  useEffect(() => {
    if (wilaya && identifiant !== identifiantWilaya(wilaya)) naviguer(routes.wilaya(identifiantWilaya(wilaya)), { replace: true });
  }, [wilaya, identifiant, naviguer]);

  if (!code) return <Navigate to={routes.wilayas} replace />;

  const nom = wilaya ? nomWilaya(wilaya, langue) : code;
  const nombre = formateur(langue);
  const titrePage = t("wilayas.metaTitre", { nom });

  const partager = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title: titrePage, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("wilayas.lienCopie"));
      }
    } catch {
      // Partage annulé : rien à faire.
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <CustomMetaTags
        title={titrePage}
        description={t("wilayas.metaDescription", { nom })}
        path={wilaya ? routes.wilaya(identifiantWilaya(wilaya)) : routes.wilayas}
      />
      <Navbar />
      <main className="flex-1 pb-16 pt-20">
        {/* En-tête : nom, population, carte de situation */}
        <section className="border-b border-emerald-900/10 bg-gradient-to-b from-emerald-50 to-gray-50 dark:border-white/5 dark:from-emerald-950/40 dark:to-gray-900">
          <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
            <nav className="mb-5 flex items-center gap-1 text-sm text-muted-foreground" aria-label={t("wilayas.filAriane")}>
              <Link to={routes.wilayas} className="hover:text-emerald-700 dark:hover:text-emerald-400">
                {t("wilayas.titre")}
              </Link>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              <span className="truncate text-foreground">{nom}</span>
            </nav>
            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_minmax(0,360px)]">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-emerald-600 px-3 py-1.5 text-lg font-bold tabular-nums text-white shadow-sm">{code}</span>
                  <DrapeauAlgerie className="h-6 w-9 rounded shadow-sm ring-1 ring-black/10" />
                </div>
                {isPending ? (
                  <Skeleton className="mt-4 h-12 w-2/3" />
                ) : (
                  <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-6xl dark:text-white">
                    {nom}
                    {wilaya?.nom.ar && langue !== "ar" && (
                      <span className="mt-1 block text-2xl font-bold text-emerald-700 md:text-3xl dark:text-emerald-400">
                        <span lang="ar" dir="rtl">
                          {wilaya.nom.ar}
                        </span>
                      </span>
                    )}
                  </h1>
                )}
                <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">{t("wilayas.accroche", { nom })}</p>

                {population && (
                  <div className="mt-6 inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-emerald-900/10 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-gray-800">
                    <Users className="h-6 w-6 text-emerald-600" aria-hidden />
                    <div>
                      <p className="text-2xl font-extrabold tabular-nums">{nombre.format(population.valeur)}</p>
                      <p className="text-sm text-muted-foreground">{t("wilayas.habitants", { annee: population.annee })}</p>
                    </div>
                    <div className="border-s border-gray-200 ps-4 dark:border-white/10">
                      <p className="text-lg font-bold">{t("wilayas.rangSur", { count: population.rang, ordinal: true, total: NB_WILAYAS })}</p>
                      <p className="text-sm text-muted-foreground">{t("wilayas.partPopulation", { part: formateur(langue, { maximumFractionDigits: 1 }).format(population.part) })}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void partager()}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    <Share2 className="h-4 w-4" aria-hidden />
                    {t("wilayas.partager")}
                  </button>
                  {autour && (
                    <>
                      <Link
                        to={routes.wilaya(identifiantWilaya(autour.precedente))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-emerald-500 dark:border-white/10 dark:bg-gray-800"
                      >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                        <span className="tabular-nums">{autour.precedente.code}</span> {nomWilaya(autour.precedente, langue)}
                      </Link>
                      <Link
                        to={routes.wilaya(identifiantWilaya(autour.suivante))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-emerald-500 dark:border-white/10 dark:bg-gray-800"
                      >
                        <span className="tabular-nums">{autour.suivante.code}</span> {nomWilaya(autour.suivante, langue)}
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className="mx-auto w-full max-w-[300px] md:max-w-none">
                <CarteWilayas surbrillance={code} />
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto max-w-6xl px-4">
          {isError ? (
            <div className="mt-10">
              <EtatErreur message={t("wilayas.erreur")} onReessayer={() => void refetch()} />
            </div>
          ) : isPending ? (
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : (
            <Contenu liste={liste} categories={categories ?? []} nom={nom} code={code} complet={chiffres.complet} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Contenu = ({ liste, categories, nom, code, complet }: { liste: ChiffreWilaya[]; categories: Categorie[]; nom: string; code: string; complet: boolean }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const essentiels = chiffresEssentiels(liste);
  const faits = faitsMarquants(liste);
  const parCategorie = useMemo(() => {
    const groupes = new Map<string, ChiffreWilaya[]>();
    for (const chiffre of [...liste].sort((a, b) => b.nombre - a.nombre)) {
      const cle = chiffre.donnee.categorie_slug ?? "autre";
      groupes.set(cle, [...(groupes.get(cle) ?? []), chiffre]);
    }
    const ordre = new Map(categories.map((categorie, indice) => [categorie.slug, indice]));
    return [...groupes.entries()].sort((a, b) => (ordre.get(a[0]) ?? 99) - (ordre.get(b[0]) ?? 99));
  }, [liste, categories]);
  const categorie = (slug: string) => categories.find((c) => c.slug === slug);

  return (
    <>
      {!complet && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          {t("wilayas.partiel")}
        </p>
      )}

      {faits.length > 0 && (
        <section className="mt-10" aria-labelledby="titre-faits">
          <h2 id="titre-faits" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trophy className="h-6 w-6 text-amber-500" aria-hidden />
            {t("wilayas.faitsMarquants")}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {faits.map((fait) => (
              <li key={fait.donnee.slug}>
                <Link
                  to={routes.donnee(fait.donnee.slug)}
                  className="flex items-center gap-4 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-amber-500/20 dark:from-amber-500/10 dark:to-gray-800"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-lg font-extrabold text-amber-950">
                    {t("wilayas.rangCourt", { count: fait.rang, ordinal: true })}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-900 dark:text-white">
                      {t("wilayas.fait", { count: fait.rang, ordinal: true, titre: titreSansPays(texteTraduit(fait.donnee.titre, langue)) })}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {t("wilayas.faitDetail", { nombre: formateur(langue).format(fait.nombre), part: formateur(langue, { maximumFractionDigits: 1 }).format(fait.part) })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {essentiels.length > 0 && (
        <section className="mt-12" aria-labelledby="titre-essentiel">
          <h2 id="titre-essentiel" className="text-2xl font-bold tracking-tight">
            {t("wilayas.essentiel", { nom })}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {essentiels.map((chiffre) => (
              <CarteChiffre key={chiffre.donnee.slug} chiffre={chiffre} categorie={categorie(chiffre.donnee.categorie_slug ?? "")} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12" aria-labelledby="titre-tout">
        <h2 id="titre-tout" className="text-2xl font-bold tracking-tight">
          {t("wilayas.toutesDonnees")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("wilayas.toutesDonneesAide", { count: liste.length })}</p>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {parCategorie.map(([slug, chiffres]) => {
            const cat = categorie(slug);
            const { icone: Icone, couleurs } = apparenceCategorie(cat?.icone);
            return (
              <section key={slug} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm md:p-5 dark:border-white/10 dark:bg-gray-800">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", couleurs)} aria-hidden>
                    <Icone className="h-4 w-4" />
                  </span>
                  {cat ? texteTraduit(cat.nom, langue) : t("wilayas.autres")}
                </h3>
                <ul className="divide-y divide-gray-100 dark:divide-white/5">
                  {chiffres.map((chiffre) => (
                    <LigneChiffre key={chiffre.donnee.slug} chiffre={chiffre} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-gray-200/80 bg-white p-5 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-gray-800">
        <p className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>{t("wilayas.methode")}</span>
        </p>
        <p className="mt-2 flex gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>{t("wilayas.estimations")}</span>
        </p>
        <p className="mt-2 flex gap-2">
          <Braces className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
          <span>
            {t("wilayas.api")}{" "}
            <a href={`${URL_API}/v1/wilayas/${code}`} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-violet-600 hover:underline dark:text-violet-400">
              {`${URL_API}/v1/wilayas/${code}`}
            </a>
          </span>
        </p>
      </section>
    </>
  );
};

/** Grand chiffre d'une donnée essentielle : nombre, unité, rang, comparaison par habitant. */
const CarteChiffre = ({ chiffre, categorie }: { chiffre: ChiffreWilaya; categorie?: Categorie }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { icone: Icone, couleurs } = apparenceCategorie(categorie?.icone);
  const decimal = formateur(langue, { maximumFractionDigits: 1 });
  const auDessus = chiffre.pour100k !== null && chiffre.pour100kNational !== null && chiffre.pour100k >= chiffre.pour100kNational;

  return (
    <Link
      to={routes.donnee(chiffre.donnee.slug)}
      className="group flex flex-col rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md dark:border-white/10 dark:bg-gray-800"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", couleurs)} aria-hidden>
          <Icone className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
          {t("wilayas.rangSur", { count: chiffre.rang, ordinal: true, total: NB_WILAYAS })}
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">{formateur(langue).format(chiffre.nombre)}</p>
      <p className="font-medium leading-snug text-gray-900 dark:text-white">
        {titreSansPays(texteTraduit(chiffre.donnee.titre, langue))}
        {estimee(chiffre.donnee) && <span className="ms-1 text-xs font-normal text-muted-foreground">({t("wilayas.estimes")})</span>}
      </p>
      {chiffre.pour100k !== null && chiffre.pour100kNational !== null && (
        <p className={cn("mt-auto pt-3 text-xs", auDessus ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300")}>
          {t("wilayas.pour100k", { valeur: decimal.format(chiffre.pour100k), national: decimal.format(chiffre.pour100kNational) })}
        </p>
      )}
    </Link>
  );
};

/** Ligne de « Toutes les données » : titre, barre relative à la wilaya la plus fournie, nombre et rang. */
const LigneChiffre = ({ chiffre }: { chiffre: ChiffreWilaya }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const largeur = chiffre.maximum > 0 ? Math.max(2, (chiffre.nombre / chiffre.maximum) * 100) : 0;
  return (
    <li>
      <Link to={routes.donnee(chiffre.donnee.slug)} className="group block py-2.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
            {titreSansPays(texteTraduit(chiffre.donnee.titre, langue))}
            {estimee(chiffre.donnee) && <span className="ms-1 text-xs font-normal text-muted-foreground">({t("wilayas.estimes")})</span>}
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums">{formateur(langue).format(chiffre.nombre)}</span>
        </span>
        <span className="mt-1.5 flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            {chiffre.nombre > 0 && <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${largeur}%` }} />}
          </span>
          <span className="w-16 shrink-0 text-end text-xs text-muted-foreground">{t("wilayas.rangSur", { count: chiffre.rang, ordinal: true, total: NB_WILAYAS })}</span>
        </span>
      </Link>
    </li>
  );
};

export default PageWilaya;
