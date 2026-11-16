import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Users } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { Skeleton } from "@/components/ui/skeleton";
import { CarteWilayas } from "@/components/wilayas/CarteWilayas";
import { useChiffresWilayas } from "@/hooks/use-wilayas";
import { useLangue } from "@/hooks/use-langue";
import { routes } from "@/lib/routes";
import { filtrerWilayas, identifiantWilaya, nomWilaya } from "@/lib/wilayas";

/** /wilayas : choisir sa wilaya sur la carte ou dans la liste (recherche par nom ou par code). */
const PageWilayas = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [terme, setTerme] = useState("");
  const { data: chiffres, isPending, isError, refetch } = useChiffresWilayas();
  const wilayas = useMemo(() => filtrerWilayas(chiffres?.wilayas ?? [], terme), [chiffres, terme]);
  const parCode = useMemo(() => new Map((chiffres?.wilayas ?? []).map((w) => [w.code, w])), [chiffres]);
  const millions = new Intl.NumberFormat(langue === "ar" ? "ar-DZ" : langue, { notation: "compact", compactDisplay: "long", maximumFractionDigits: 1 });

  const lien = (code: string) => {
    const wilaya = parCode.get(code);
    return routes.wilaya(wilaya ? identifiantWilaya(wilaya) : code);
  };

  return (
    <MiseEnPage titre={t("wilayas.titre")} sousTitre={t("wilayas.sousTitre")} chemin={routes.wilayas} largeur="large">
      {isError ? (
        <EtatErreur message={t("wilayas.erreur")} onReessayer={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-800">
              <CarteWilayas lien={lien} nom={(code) => { const w = parCode.get(code); return w ? `${code} · ${nomWilaya(w, langue)}` : code; }} />
              <p className="mt-2 text-center text-xs text-muted-foreground">{t("wilayas.carteAide")}</p>
            </div>
          </div>

          <div className="min-w-0">
            <label className="relative block">
              <span className="sr-only">{t("wilayas.rechercher")}</span>
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={terme}
                onChange={(evenement) => setTerme(evenement.target.value)}
                placeholder={t("wilayas.rechercher")}
                className="!m-0 h-12 w-full !rounded-full !border !border-gray-200 !bg-white !ps-12 !pe-4 text-base shadow-sm focus:!border-emerald-500 focus:!ring-2 focus:!ring-emerald-500/30 dark:!border-white/10 dark:!bg-gray-800"
              />
            </label>

            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-busy={isPending}>
              {isPending
                ? Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
                : wilayas.map((wilaya) => (
                    <li key={wilaya.code}>
                      <Link
                        to={routes.wilaya(identifiantWilaya(wilaya))}
                        className="group flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md dark:border-white/10 dark:bg-gray-800"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-base font-bold tabular-nums text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {wilaya.code}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-gray-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                            {nomWilaya(wilaya, langue)}
                          </span>
                          {wilaya.population ? (
                            <span className="flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                              {t("wilayas.habitantsCourt", { valeur: millions.format(wilaya.population.valeur) })}
                            </span>
                          ) : (
                            langue !== "ar" && wilaya.nom.ar && <span className="block truncate text-sm text-muted-foreground" lang="ar">{wilaya.nom.ar}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
            </ul>
            {!isPending && wilayas.length === 0 && <p className="mt-8 text-center text-muted-foreground">{t("wilayas.aucune")}</p>}
          </div>
        </div>
      )}
    </MiseEnPage>
  );
};

export default PageWilayas;
