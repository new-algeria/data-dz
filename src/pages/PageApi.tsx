import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BookOpen, Braces, Check, Copy, ExternalLink, FileJson, Gauge, KeyRound, Search, SearchX, Terminal, Zap } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { EtatErreur } from "@/components/EtatErreur";
import { BadgeCategorie } from "@/components/BadgeCategorie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLangue } from "@/hooks/use-langue";
import { URL_API, urlApiDonnee } from "@/lib/api";
import { chargerCatalogue, chargerCategories } from "@/lib/catalogue";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

const URL_DOCS = `${URL_API}/docs`;
const URL_OPENAPI = `${URL_API}/openapi.json`;

/** Bouton qui copie un texte (URL, exemple de code) et le confirme. */
const BoutonCopier = ({ texte, libelle, className }: { texte: string; libelle: string; className?: string }) => {
  const { t } = useTranslation();
  const [copie, setCopie] = useState(false);
  useEffect(() => {
    if (!copie) return;
    const minuteur = window.setTimeout(() => setCopie(false), 2000);
    return () => window.clearTimeout(minuteur);
  }, [copie]);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      toast.success(t("pageApi.copie"));
    } catch {
      toast.error(t("api.copieImpossible"));
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={copier}
      aria-label={libelle}
      title={libelle}
      className={cn("h-8 w-8 shrink-0 text-violet-700 hover:bg-violet-100 hover:text-violet-900 dark:text-violet-300 dark:hover:bg-violet-500/20 dark:hover:text-violet-100", className)}
    >
      {copie ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
    </Button>
  );
};

const Verbe = () => (
  <span className="shrink-0 rounded bg-violet-600 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white dark:bg-violet-500">GET</span>
);

/** Exemples prêts à copier, avec une vraie donnée du catalogue. */
const exemples = (slug: string): Record<"curl" | "javascript" | "python", string> => ({
  curl: `curl "${urlApiDonnee(slug)}"\ncurl "${urlApiDonnee(slug)}/data?limit=10"`,
  javascript: `const reponse = await fetch("${urlApiDonnee(slug)}/data?limit=100");\nconst { data } = await reponse.json();\nconsole.log(data);`,
  python: `import requests\n\nreponse = requests.get("${urlApiDonnee(slug)}/data", params={"limit": 100})\nprint(reponse.json()["data"])`,
});

const LANGAGES = ["curl", "javascript", "python"] as const;

// Routes publiques principales de l'API (référence complète : la documentation interactive).
const ROUTES_API = [
  { chemin: "/v1/datasets", cle: "liste" },
  { chemin: "/v1/datasets/{slug}", cle: "fiche" },
  { chemin: "/v1/datasets/{slug}/data", cle: "donnees" },
  { chemin: "/v1/datasets/{slug}/download?format=csv", cle: "telechargement" },
  { chemin: "/v1/categories", cle: "categories" },
  { chemin: "/v1/stats", cle: "stats" },
] as const;

/** Page /api : présentation de l'API publique et liste de toutes les données avec leur lien API. */
const PageApi = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [saisie, setSaisie] = useState("");
  const [langage, setLangage] = useState<(typeof LANGAGES)[number]>("curl");

  // Même clé que le catalogue de l'accueil : une seule requête si l'on vient de l'accueil.
  const requete = useQuery({ queryKey: ["catalogue", "", null], queryFn: () => chargerCatalogue({ terme: "", categorie: null }) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const parCategorie = useMemo(() => new Map(categories.map((categorie) => [categorie.slug, categorie])), [categories]);

  const collateur = useMemo(() => new Intl.Collator(langue, { sensitivity: "base" }), [langue]);
  const donnees = useMemo(() => {
    const terme = saisie.trim().toLowerCase();
    return [...(requete.data ?? [])]
      .filter((donnee) => !terme || `${texteTraduit(donnee.titre, langue)} ${donnee.slug} ${donnee.sources?.nom ?? ""}`.toLowerCase().includes(terme))
      .sort((a, b) => collateur.compare(texteTraduit(a.titre, langue), texteTraduit(b.titre, langue)));
  }, [requete.data, saisie, langue, collateur]);

  const slugExemple = requete.data?.[0]?.slug ?? "pharmacies";
  const code = exemples(slugExemple)[langage];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <CustomMetaTags title={`${t("pageApi.titre")} - data-dz`} description={t("pageApi.sousTitre")} path={routes.api} />
      <Navbar />

      <main className="flex-1">
        {/* En-tête violet, couleur de l'API sur tout le site */}
        <section className="relative overflow-hidden bg-gradient-to-b from-violet-100 via-violet-50 to-gray-50 pt-16 dark:from-violet-950/60 dark:via-gray-900 dark:to-gray-900">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-24 end-[-6rem] h-80 w-80 rounded-full bg-violet-300/40 blur-3xl animate-flotter dark:bg-violet-600/20" />
            <div className="absolute bottom-[-6rem] start-[-4rem] h-64 w-64 rounded-full bg-fuchsia-200/40 blur-3xl animate-flotter-lent dark:bg-fuchsia-600/10" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative container mx-auto max-w-5xl px-4 py-12 md:py-16"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-white/70 px-3 py-1 text-sm font-medium text-violet-800 backdrop-blur dark:bg-white/5 dark:text-violet-200">
              <Braces className="h-4 w-4" aria-hidden />
              {t("pageApi.badge")}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl dark:text-white">{t("pageApi.titre")}</h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">{t("pageApi.sousTitre")}</p>

            {/* Adresse de base */}
            <div className="mt-6 flex max-w-xl items-center gap-2 rounded-xl border border-violet-500/30 bg-white/80 p-2 ps-3 shadow-sm backdrop-blur dark:bg-gray-900/60">
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">{t("pageApi.base")}</span>
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-gray-900 dark:text-gray-100" dir="ltr">
                {URL_API}/v1
              </code>
              <BoutonCopier texte={`${URL_API}/v1`} libelle={t("pageApi.copierBase")} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="gap-2 bg-violet-700 text-white shadow-lg shadow-violet-700/25 hover:bg-violet-800">
                <a href={URL_DOCS} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4" />
                  {t("pageApi.docs")}
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2 border-violet-500/40 bg-white/70 text-violet-900 hover:bg-violet-50 dark:bg-white/5 dark:text-violet-100 dark:hover:bg-violet-500/10">
                <a href={URL_OPENAPI} target="_blank" rel="noopener noreferrer">
                  <FileJson className="h-4 w-4" />
                  {t("pageApi.openapi")}
                </a>
              </Button>
            </div>

            {/* Trois points clés */}
            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icone: KeyRound, cle: "sansCle" },
                { icone: Zap, cle: "formats" },
                { icone: Gauge, cle: "limites" },
              ].map(({ icone: Icone, cle }) => (
                <li key={cle} className="flex items-start gap-3 rounded-xl border border-violet-500/15 bg-white/70 p-3 text-sm backdrop-blur dark:bg-white/5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    <Icone className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900 dark:text-white">{t(`pageApi.points.${cle}.titre`)}</span>
                    <span className="text-muted-foreground">{t(`pageApi.points.${cle}.texte`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
          {/* Démarrer */}
          <section aria-labelledby="titre-demarrer" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-gray-800">
              <h2 id="titre-demarrer" className="flex items-center gap-2 text-lg font-semibold">
                <Terminal className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
                {t("pageApi.demarrer")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("pageApi.demarrerTexte")}</p>
              <div role="tablist" aria-label={t("pageApi.langage")} className="mt-4 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/10">
                {LANGAGES.map((element) => (
                  <button
                    key={element}
                    type="button"
                    role="tab"
                    aria-selected={langage === element}
                    onClick={() => setLangage(element)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                      langage === element ? "bg-white text-violet-800 shadow-sm dark:bg-gray-900 dark:text-violet-300" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(`pageApi.langages.${element}`)}
                  </button>
                ))}
              </div>
              <div className="relative mt-3 text-left" dir="ltr">
                <pre className="whitespace-pre-wrap break-all rounded-xl bg-gray-950 p-4 pe-12 text-[13px] leading-relaxed text-violet-100">
                  <code>{code}</code>
                </pre>
                <BoutonCopier
                  texte={code}
                  libelle={t("pageApi.copierCode")}
                  className="absolute end-2 top-2 text-violet-200 hover:bg-white/10 hover:text-white dark:hover:bg-white/10"
                />
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-gray-800">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Braces className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
                {t("pageApi.routes")}
              </h2>
              <ul className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
                {ROUTES_API.map((route) => (
                  <li key={route.chemin} className="py-2.5">
                    <p className="flex min-w-0 items-center gap-2" dir="ltr">
                      <Verbe />
                      <code className="truncate font-mono text-sm text-gray-900 dark:text-gray-100">{route.chemin}</code>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{t(`pageApi.routesDetail.${route.cle}`)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Toutes les données */}
          <section aria-labelledby="titre-donnees" className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-gray-800">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="titre-donnees" className="text-lg font-semibold">
                  {t("pageApi.donnees")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {requete.data ? t("pageApi.nbDonnees", { count: requete.data.length }) : t("pageApi.donneesTexte")}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={saisie}
                  onChange={(evenement) => setSaisie(evenement.target.value)}
                  placeholder={t("pageApi.filtrer")}
                  aria-label={t("pageApi.filtrer")}
                  className="ps-9"
                />
              </div>
            </div>

            {requete.isPending ? (
              <div className="mt-5 space-y-3" aria-busy="true">
                {Array.from({ length: 5 }, (_, indice) => (
                  <Skeleton key={indice} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : requete.isError ? (
              <div className="mt-5">
                <EtatErreur message={t("catalogue.erreur")} onReessayer={() => requete.refetch()} />
              </div>
            ) : donnees.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <SearchX className="h-8 w-8" aria-hidden />
                {t("pageApi.aucune")}
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-gray-100 dark:divide-white/10">
                {donnees.map((donnee) => {
                  const url = urlApiDonnee(donnee.slug);
                  const categorie = donnee.categorie_slug ? parCategorie.get(donnee.categorie_slug) : undefined;
                  return (
                    <li key={donnee.slug} className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
                      <div className="min-w-0 md:w-2/5">
                        <Link to={routes.donnee(donnee.slug)} className="font-semibold text-gray-900 hover:text-violet-700 hover:underline dark:text-white dark:hover:text-violet-300">
                          {texteTraduit(donnee.titre, langue)}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {categorie && <BadgeCategorie nom={categorie.nom} icone={categorie.icone} />}
                          {donnee.sources?.nom && <span>{donnee.sources.nom}</span>}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-violet-500/25 bg-violet-50/70 py-1 pe-1 ps-2 dark:bg-violet-500/10">
                        <Verbe />
                        <code className="min-w-0 flex-1 truncate font-mono text-xs text-violet-950 dark:text-violet-100" dir="ltr" title={url}>
                          {url}
                        </code>
                        <BoutonCopier texte={url} libelle={`${t("api.copier")} : ${url}`} />
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button asChild size="sm" variant="outline" className="gap-1.5 border-violet-500/30 text-violet-800 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10">
                          <a href={`${url}/data?limit=100`} target="_blank" rel="noopener noreferrer">
                            <FileJson className="h-4 w-4" aria-hidden />
                            {t("pageApi.voirJson")}
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="gap-1.5">
                          <Link to={routes.donnee(donnee.slug)}>{t("pageApi.voirFiche")}</Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="text-center text-sm text-muted-foreground">{t("pageApi.licence")}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PageApi;
