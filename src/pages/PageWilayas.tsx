import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Search, ChartNoAxesColumnIncreasing, Users, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { EtatErreur } from "@/components/EtatErreur";
import { Skeleton } from "@/components/ui/skeleton";
import { CarteChoroplethe } from "@/components/wilayas/CarteChoroplethe";
import { TEINTES_LEGENDE } from "@/components/wilayas/teintes";
import { useChiffresWilayas } from "@/hooks/use-wilayas";
import { useLangue } from "@/hooks/use-langue";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";
import {
  classeDeValeur,
  classementMesure,
  codeDepuisIdentifiant,
  estimee,
  filtrerWilayas,
  identifiantWilaya,
  MESURE_POPULATION,
  MESURES_CARTE,
  NB_WILAYAS,
  nomWilaya,
  rangDe,
  seuilsQuantiles,
  titreSansPays,
  valeursMesure,
  type ChiffresWilayas,
  type ModeCarte,
} from "@/lib/wilayas";

const formateur = (langue: string, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(langue === "ar" ? "ar-DZ" : langue, options);

/**
 * /wilayas : grande carte des 69 wilayas, colorée selon une mesure (population, écoles, pharmacies…, au total ou pour
 * 100 000 habitants), recherche, et fiche de la wilaya choisie. La wilaya, la mesure et le mode sont dans l'URL
 * (`?wilaya=16&mesure=pharmacies&mode=habitants`) pour pouvoir partager une vue.
 */
const PageWilayas = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [params, setParams] = useSearchParams();
  const { data: chiffres, isPending, isError, refetch } = useChiffresWilayas();

  const mesures = useMemo(() => {
    const disponibles = new Set(chiffres?.donnees.map((donnee) => donnee.slug) ?? []);
    return [MESURE_POPULATION, ...MESURES_CARTE.filter((slug) => disponibles.has(slug))];
  }, [chiffres]);
  const mesure = mesures.includes(params.get("mesure") ?? "") ? params.get("mesure")! : MESURE_POPULATION;
  const mode: ModeCarte = params.get("mode") === "habitants" && mesure !== MESURE_POPULATION ? "habitants" : "total";
  const choisie = codeDepuisIdentifiant(params.get("wilaya") ?? undefined);
  const fiche = useRef<HTMLElement>(null);

  const changer = (valeurs: Record<string, string | null>) =>
    setParams(
      (avant) => {
        const suite = new URLSearchParams(avant);
        for (const [cle, valeur] of Object.entries(valeurs)) {
          if (valeur) suite.set(cle, valeur);
          else suite.delete(cle);
        }
        return suite;
      },
      { replace: true }
    );

  // Sur téléphone, la fiche est sous la carte : on y fait défiler l'écran quand on choisit une wilaya.
  const choisir = (code: string) => {
    changer({ wilaya: code });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.requestAnimationFrame(() => fiche.current?.scrollIntoView({ behavior: doux ? "smooth" : "auto", block: "start" }));
    }
  };

  const valeurs = useMemo(() => (chiffres ? valeursMesure(chiffres, mesure, mode) : {}), [chiffres, mesure, mode]);
  const seuils = useMemo(() => seuilsQuantiles(Object.values(valeurs)), [valeurs]);
  const classes = useMemo(() => Object.fromEntries(Object.entries(valeurs).map(([code, valeur]) => [code, classeDeValeur(valeur, seuils)])), [valeurs, seuils]);

  const libelleMesure = (slug: string) => {
    if (slug === MESURE_POPULATION) return t("wilayas.carte.population");
    const donnee = chiffres?.donnees.find((d) => d.slug === slug);
    return donnee ? titreSansPays(texteTraduit(donnee.titre, langue)) : slug;
  };
  const formatValeur = (valeur: number) =>
    mode === "habitants" ? formateur(langue, { maximumFractionDigits: 1 }).format(valeur) : valeur >= 100_000 ? formateur(langue, { notation: "compact", maximumFractionDigits: 1 }).format(valeur) : formateur(langue).format(Math.round(valeur));
  const unite = mesure === MESURE_POPULATION ? t("wilayas.carte.uniteHabitants") : mode === "habitants" ? t("wilayas.carte.unitePour100k") : "";

  const nom = (code: string) => {
    const wilaya = chiffres?.wilayas.find((w) => w.code === code);
    return wilaya ? nomWilaya(wilaya, langue) : code;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <CustomMetaTags title={`${t("wilayas.titre")} - data-dz`} description={t("wilayas.sousTitre")} path={routes.wilayas} />
      <Navbar />
      <main className="container mx-auto max-w-7xl flex-1 px-4 pb-16 pt-24">
        <div className="grid grid-cols-1 items-end gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("wilayas.titre")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">{t("wilayas.carte.sousTitre")}</p>
          </div>
          {chiffres && <RechercheWilaya chiffres={chiffres} onChoisir={choisir} />}
        </div>

        {isError ? (
          <div className="mt-8">
            <EtatErreur message={t("wilayas.erreur")} onReessayer={() => void refetch()} />
          </div>
        ) : (
          <>
            <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]" role="group" aria-label={t("wilayas.carte.colorerSelon")}>
              {isPending
                ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />)
                : mesures.map((slug) => {
                    const donnee = chiffres?.donnees.find((d) => d.slug === slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        aria-pressed={slug === mesure}
                        onClick={() => changer({ mesure: slug === MESURE_POPULATION ? null : slug })}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                          slug === mesure
                            ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200"
                        )}
                      >
                        {libelleMesure(slug)}
                        {donnee && estimee(donnee) && <span className="ms-1 opacity-60">*</span>}
                      </button>
                    );
                  })}
            </div>

            <div className="mt-3 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
              <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm md:p-5 dark:border-white/10 dark:bg-gray-800" aria-label={t("wilayas.carteLibelle")}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-gray-900" role="group" aria-label={t("wilayas.carte.mode")}>
                    {(["total", "habitants"] as const).map((valeur) => (
                      <button
                        key={valeur}
                        type="button"
                        aria-pressed={mode === valeur}
                        disabled={valeur === "habitants" && mesure === MESURE_POPULATION}
                        onClick={() => changer({ mode: valeur === "habitants" ? valeur : null })}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          mode === valeur ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white" : "text-muted-foreground"
                        )}
                      >
                        {t(valeur === "total" ? "wilayas.carte.nombre" : "wilayas.carte.pour100k")}
                      </button>
                    ))}
                  </div>
                  {seuils.length > 0 && (
                    <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                      <span>{t("wilayas.carte.moins")}</span>
                      <span className="flex overflow-hidden rounded" aria-hidden>
                        {TEINTES_LEGENDE.map((teinte) => (
                          <i key={teinte} className={cn("h-2.5 w-5", teinte)} />
                        ))}
                      </span>
                      <span>{t("wilayas.carte.plus")}</span>
                    </div>
                  )}
                </div>
                {isPending ? (
                  <Skeleton className="aspect-square w-full rounded-xl" />
                ) : (
                  <CarteChoroplethe
                    classes={classes}
                    choisie={choisie}
                    onChoisir={choisir}
                    bulle={(code) => ({
                      titre: `${code} · ${nom(code)}`,
                      detail: `${libelleMesure(mesure)} : ${formatValeur(valeurs[code] ?? 0)}${unite ? ` ${unite}` : ""}`,
                    })}
                  />
                )}
              </section>

              <aside ref={fiche} className="scroll-mt-20 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-24 dark:border-white/10 dark:bg-gray-800" aria-live="polite">
                {isPending || !chiffres ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-2/3" />
                    {Array.from({ length: 8 }, (_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : choisie ? (
                  <FicheWilaya chiffres={chiffres} code={choisie} mesure={mesure} onFermer={() => changer({ wilaya: null })} />
                ) : (
                  <Classement
                    chiffres={chiffres}
                    mesure={mesure}
                    mode={mode}
                    titre={libelleMesure(mesure)}
                    formatValeur={formatValeur}
                    onChoisir={choisir}
                  />
                )}
              </aside>
            </div>

            {chiffres && <ToutesLesWilayas chiffres={chiffres} />}
            <p className="mt-6 text-xs text-muted-foreground">{t("wilayas.carte.note")}</p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

/** Recherche par nom (fr / ar, sans accents) ou numéro, avec suggestions au clavier. */
const RechercheWilaya = ({ chiffres, onChoisir }: { chiffres: ChiffresWilayas; onChoisir: (code: string) => void }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [terme, setTerme] = useState("");
  const [actif, setActif] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const resultats = useMemo(() => (terme.trim() ? filtrerWilayas(chiffres.wilayas, terme).slice(0, 8) : []), [chiffres, terme]);

  const valider = (code: string) => {
    onChoisir(code);
    setTerme("");
    setOuvert(false);
    champ.current?.blur();
  };
  const surTouche = (evenement: KeyboardEvent<HTMLInputElement>) => {
    if (evenement.key === "ArrowDown") {
      evenement.preventDefault();
      setActif((i) => Math.min(i + 1, resultats.length - 1));
    } else if (evenement.key === "ArrowUp") {
      evenement.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (evenement.key === "Enter" && resultats[actif]) {
      evenement.preventDefault();
      valider(resultats[actif].code);
    } else if (evenement.key === "Escape") {
      setTerme("");
      setOuvert(false);
    }
  };

  return (
    <div className="relative">
      <label htmlFor="recherche-wilaya" className="sr-only">
        {t("wilayas.rechercher")}
      </label>
      <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id="recherche-wilaya"
        ref={champ}
        type="search"
        role="combobox"
        aria-expanded={ouvert && terme.trim().length > 0}
        aria-controls="suggestions-wilayas"
        aria-autocomplete="list"
        autoComplete="off"
        value={terme}
        placeholder={t("wilayas.rechercher")}
        onChange={(evenement) => {
          setTerme(evenement.target.value);
          setActif(0);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => window.setTimeout(() => setOuvert(false), 150)}
        onKeyDown={surTouche}
        className="!m-0 h-12 w-full !rounded-full !border !border-gray-200 !bg-white !pe-4 !ps-12 text-base shadow-sm focus:!border-emerald-500 focus:!ring-2 focus:!ring-emerald-500/20 dark:!border-white/10 dark:!bg-gray-800"
      />
      {ouvert && terme.trim() && (
        <ul id="suggestions-wilayas" role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-gray-200 bg-popover p-1.5 text-popover-foreground shadow-xl dark:border-white/10">
          {resultats.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">{t("wilayas.aucune")}</li>
          ) : (
            resultats.map((wilaya, indice) => (
              <li key={wilaya.code} role="option" aria-selected={indice === actif}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActif(indice)}
                  onClick={() => valider(wilaya.code)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm", indice === actif && "bg-accent")}
                >
                  <span className="w-8 shrink-0 rounded-md bg-gray-100 py-0.5 text-center text-xs font-bold tabular-nums dark:bg-white/10">{wilaya.code}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{nomWilaya(wilaya, langue)}</span>
                  {langue !== "ar" && wilaya.nom.ar && (
                    <span className="shrink-0 text-xs text-muted-foreground" lang="ar">
                      {wilaya.nom.ar}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

/** Sans wilaya choisie : les 10 wilayas les mieux placées pour la mesure affichée. */
const Classement = ({
  chiffres,
  mesure,
  mode,
  titre,
  formatValeur,
  onChoisir,
}: {
  chiffres: ChiffresWilayas;
  mesure: string;
  mode: ModeCarte;
  titre: string;
  formatValeur: (valeur: number) => string;
  onChoisir: (code: string) => void;
}) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const lignes = classementMesure(chiffres, mesure, mode, 10);
  const maximum = lignes[0]?.valeur ?? 0;
  return (
    <>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ChartNoAxesColumnIncreasing className="h-4 w-4 text-muted-foreground" aria-hidden />
        {t("wilayas.carte.classement")}
      </p>
      <h2 className="mt-1 text-xl font-bold leading-tight">
        {titre}
        {mode === "habitants" && <span className="block text-sm font-medium text-muted-foreground">{t("wilayas.carte.unitePour100k")}</span>}
      </h2>
      <ol className="mt-4 space-y-1">
        {lignes.map(({ wilaya, valeur }, indice) => (
          <li key={wilaya.code}>
            <button type="button" onClick={() => onChoisir(wilaya.code)} className="group w-full rounded-lg px-2 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-white/5">
              <span className="flex items-baseline gap-2 text-sm">
                <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{indice + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{nomWilaya(wilaya, langue)}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatValeur(valeur)}</span>
              </span>
              <span className="ms-7 mt-1 block h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${maximum > 0 ? (valeur / maximum) * 100 : 0}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">{t("wilayas.carte.aide")}</p>
    </>
  );
};

/** Wilaya choisie : population et rang, chiffres de chaque mesure avec leur rang, lien vers la page complète. */
const FicheWilaya = ({ chiffres, code, mesure, onFermer }: { chiffres: ChiffresWilayas; code: string; mesure: string; onFermer: () => void }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const wilaya = chiffres.wilayas.find((w) => w.code === code);
  if (!wilaya) return null;
  const codes = chiffres.wilayas.map((w) => w.code);
  const populations = Object.fromEntries(chiffres.wilayas.map((w) => [w.code, w.population?.valeur ?? 0]));
  const nombre = formateur(langue);
  const lignes = MESURES_CARTE.map((slug) => chiffres.donnees.find((d) => d.slug === slug)).filter((d): d is NonNullable<typeof d> => Boolean(d));

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-sm font-bold tabular-nums text-white dark:bg-white dark:text-gray-900">{wilaya.code}</span>
        <button type="button" onClick={onFermer} aria-label={t("wilayas.carte.fermer")} className="rounded-full p-1.5 text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/10">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">{nomWilaya(wilaya, langue)}</h2>
      {langue !== "ar" && wilaya.nom.ar && (
        <p className="text-lg font-semibold text-muted-foreground">
          <span lang="ar" dir="rtl">
            {wilaya.nom.ar}
          </span>
        </p>
      )}
      {wilaya.population && (
        <div className="mt-4 flex items-center gap-3 border-y border-gray-100 py-3 dark:border-white/10">
          <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold tabular-nums">{nombre.format(wilaya.population.valeur)}</p>
            <p className="text-xs text-muted-foreground">{t("wilayas.habitants", { annee: wilaya.population.annee })}</p>
          </div>
          <span className="text-sm font-semibold">{t("wilayas.rangSur", { count: rangDe(populations, code, codes), ordinal: true, total: NB_WILAYAS })}</span>
        </div>
      )}
      <ul className="mt-3 space-y-0.5">
        {lignes.map((donnee) => {
          const n = donnee.comptes[code] ?? 0;
          const rang = rangDe(donnee.comptes, code, codes);
          const top = rang <= 3 && n > 0;
          return (
            <li key={donnee.slug} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm", donnee.slug === mesure && "bg-gray-100 dark:bg-white/10")}>
              <span className="min-w-0 flex-1 truncate">
                {titreSansPays(texteTraduit(donnee.titre, langue))}
                {estimee(donnee) && <span className="ms-1 text-xs text-muted-foreground">({t("wilayas.estimes")})</span>}
              </span>
              <span className="font-semibold tabular-nums">{nombre.format(n)}</span>
              <span
                className={cn(
                  "w-[4.5rem] shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                  top ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-gray-100 text-muted-foreground dark:bg-white/10"
                )}
              >
                {t("wilayas.rangSur", { count: rang, ordinal: true, total: NB_WILAYAS })}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        to={routes.wilaya(identifiantWilaya(wilaya))}
        className="mt-5 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        {t("wilayas.carte.voirPage", { nom: nomWilaya(wilaya, langue) })}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </Link>
    </>
  );
};

/** Liens vers les 69 pages (clavier, lecteurs d'écran, moteurs de recherche). */
const ToutesLesWilayas = ({ chiffres }: { chiffres: ChiffresWilayas }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  return (
    <section className="mt-10" aria-labelledby="titre-toutes-wilayas">
      <h2 id="titre-toutes-wilayas" className="text-lg font-semibold">
        {t("wilayas.carte.toutes")}
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {chiffres.wilayas.map((wilaya) => (
          <li key={wilaya.code} className="min-w-0">
            <Link to={routes.wilaya(identifiantWilaya(wilaya))} className="flex gap-2 truncate rounded py-1 text-gray-700 hover:text-emerald-700 dark:text-gray-300 dark:hover:text-emerald-400">
              <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{wilaya.code}</span>
              <span className="truncate">{nomWilaya(wilaya, langue)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PageWilayas;
