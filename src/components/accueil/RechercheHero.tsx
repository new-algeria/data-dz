import { useState, type FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, Lightbulb, Pill, School, Search, TrainFront } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// Exemples choisis parce qu'ils renvoient des résultats dans les trois langues (le terme affiché est celui recherché).
const EXEMPLES = [
  { cle: "pharmacies", icone: Pill },
  { cle: "gares", icone: TrainFront },
  { cle: "ecoles", icone: School },
  { cle: "emploi", icone: BriefcaseBusiness },
] as const;

/** Recherche du hero : remplit la recherche du catalogue puis y fait défiler la page. */
export const RechercheHero = ({ onRechercher }: { onRechercher: (terme: string) => void }) => {
  const { t } = useTranslation();
  const [saisie, setSaisie] = useState("");

  const envoyer = (event: FormEvent) => {
    event.preventDefault();
    onRechercher(saisie.trim());
  };

  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-2.5 shadow-lg shadow-emerald-900/5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <form role="search" onSubmit={envoyer} className="flex items-center gap-2 rounded-xl bg-emerald-50/80 p-1.5 ps-3 dark:bg-white/5">
        <Search className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
        <input
          type="search"
          value={saisie}
          onChange={(event) => setSaisie(event.target.value)}
          placeholder={t("accueil.recherche.placeholder")}
          aria-label={t("catalogue.rechercheLabel")}
          // `!` : le plugin Flowbite impose bordure, fond et marges à tous les champs.
          className="min-w-0 flex-1 !border-0 !bg-transparent !px-0 !py-2 !shadow-none text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:!ring-0 dark:text-white dark:placeholder:text-gray-400 sm:text-base"
        />
        <Button type="submit" className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-800 group">
          {t("accueil.recherche.bouton")}
          <ArrowRight className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          {t("accueil.recherche.exemples")}
        </span>
        {EXEMPLES.map(({ cle, icone: Icone }) => {
          const terme = t(`accueil.recherche.exemple.${cle}`);
          return (
            <button
              key={cle}
              type="button"
              onClick={() => onRechercher(terme)}
              className="inline-flex items-center gap-1 rounded-full bg-gray-900/5 px-2.5 py-1 font-medium text-gray-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-200"
            >
              <Icone className="h-3.5 w-3.5" aria-hidden />
              {terme}
            </button>
          );
        })}
      </div>
    </div>
  );
};
