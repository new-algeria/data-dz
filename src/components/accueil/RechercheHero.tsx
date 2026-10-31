import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, ChevronRight, Lightbulb, Pill, School, Search, TrainFront } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// Exemples choisis parce qu'ils renvoient des résultats dans les trois langues (le terme affiché est celui recherché).
const EXEMPLES = [
  { cle: "pharmacies", icone: Pill },
  { cle: "gares", icone: TrainFront },
  { cle: "ecoles", icone: School },
  { cle: "emploi", icone: BriefcaseBusiness },
] as const;

// Placeholder selon la largeur : complet à partir de « sm », « Rechercher une donnée… » sur mobile,
// « Rechercher… » sous 360 px (iPhone SE), où le champ est trop étroit pour la version mobile.
const useLargeur = () => {
  const lire = () =>
    typeof window === "undefined" ? "mobile" : window.matchMedia("(min-width: 640px)").matches ? "grand" : window.matchMedia("(min-width: 360px)").matches ? "mobile" : "etroit";
  const [largeur, setLargeur] = useState(lire);
  useEffect(() => {
    const requetes = ["(min-width: 640px)", "(min-width: 360px)"].map((requete) => window.matchMedia(requete));
    const surChangement = () => setLargeur(lire());
    requetes.forEach((requete) => requete.addEventListener("change", surChangement));
    return () => requetes.forEach((requete) => requete.removeEventListener("change", surChangement));
  }, []);
  return largeur;
};

const PLACEHOLDERS = { grand: "accueil.recherche.placeholderLong", mobile: "accueil.recherche.placeholder", etroit: "accueil.recherche.placeholderCourt" } as const;

/**
 * Exemples sur une seule ligne : s'ils ne tiennent pas (mobile), la ligne défile au doigt et une flèche
 * en bout de ligne fait apparaître les suivants (elle disparaît une fois au bout). Sens inversé en arabe.
 */
const useLigneDefilante = () => {
  const ligne = useRef<HTMLDivElement>(null);
  const [suite, setSuite] = useState(false);
  const mesurer = useCallback(() => {
    const element = ligne.current;
    if (!element) return;
    // En RTL, scrollLeft est négatif : on compare la distance parcourue, quel que soit le sens.
    setSuite(Math.abs(element.scrollLeft) + element.clientWidth < element.scrollWidth - 4);
  }, []);
  // Remesure quand la ligne ou un exemple change de taille (écran, police chargée, changement de langue).
  useEffect(() => {
    const element = ligne.current;
    if (!element) return;
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    Array.from(element.children).forEach((enfant) => observateur.observe(enfant));
    return () => observateur.disconnect();
  }, [mesurer]);
  const avancer = () => {
    const element = ligne.current;
    if (!element) return;
    const sens = getComputedStyle(element).direction === "rtl" ? -1 : 1;
    element.scrollBy({ left: sens * element.clientWidth * 0.7, behavior: "smooth" });
  };
  return { ligne, suite, mesurer, avancer };
};

/** Recherche du hero : remplit la recherche du catalogue puis y fait défiler la page. */
export const RechercheHero = ({ onRechercher }: { onRechercher: (terme: string) => void }) => {
  const { t } = useTranslation();
  const [saisie, setSaisie] = useState("");
  const largeur = useLargeur();
  const { ligne, suite, mesurer, avancer } = useLigneDefilante();

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
          placeholder={t(PLACEHOLDERS[largeur])}
          aria-label={t("catalogue.rechercheLabel")}
          // `!` : le plugin Flowbite impose bordure, fond et marges à tous les champs.
          className="min-w-0 flex-1 !border-0 !bg-transparent !px-0 !py-2 !shadow-none text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:!ring-0 dark:text-white dark:placeholder:text-gray-400"
        />
        {/* Sur mobile, le bouton se réduit à la flèche pour laisser toute la place au champ. */}
        <Button type="submit" className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-800 group max-sm:w-10 max-sm:px-0" aria-label={t("accueil.recherche.bouton")}>
          <span className="max-sm:sr-only">{t("accueil.recherche.bouton")}</span>
          <ArrowRight className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
        </Button>
      </form>
      <div className="mt-2 flex items-center gap-1.5 px-1 text-xs">
        <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          {t("accueil.recherche.exemples")}
        </span>
        <div className="relative min-w-0 flex-1">
          <div
            ref={ligne}
            onScroll={mesurer}
            className={`flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              suite ? "[mask-image:linear-gradient(to_right,black_75%,transparent)] rtl:[mask-image:linear-gradient(to_left,black_75%,transparent)]" : ""
            }`}
          >
            {EXEMPLES.map(({ cle, icone: Icone }) => {
              const terme = t(`accueil.recherche.exemple.${cle}`);
              return (
                <button
                  key={cle}
                  type="button"
                  onClick={() => onRechercher(terme)}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-gray-900/5 px-2.5 py-1 font-medium text-gray-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-200"
                >
                  <Icone className="h-3.5 w-3.5" aria-hidden />
                  {terme}
                </button>
              );
            })}
          </div>
          {suite && (
            <button
              type="button"
              onClick={avancer}
              aria-label={t("accueil.recherche.autresExemples")}
              className="absolute end-0 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-emerald-700 shadow ring-1 ring-gray-200 transition-colors hover:bg-emerald-50 dark:bg-gray-800 dark:text-emerald-300 dark:ring-white/10"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
