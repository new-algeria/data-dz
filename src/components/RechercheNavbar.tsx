import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconeCategorie } from "@/components/BadgeCategorie";
import { chargerCatalogue, chargerCategories } from "@/lib/catalogue";
import { rechercherDonnees } from "@/lib/recherche-rapide";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { cn } from "@/lib/utils";

/** Évènement écouté par l'accueil : remplit la recherche du catalogue sans recharger la page. */
export const EVENEMENT_RECHERCHE = "data-dz:rechercher";

/**
 * Recherche de l'en-tête : résultats sous le champ pendant la frappe (catalogue déjà chargé, même clé React Query
 * que l'accueil), flèches et Entrée au clavier ; Entrée sans choix → catalogue filtré (`?q=`).
 */
export const RechercheNavbar = ({ autoFocus = false, onTermine, className }: { autoFocus?: boolean; onTermine?: () => void; className?: string }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const naviguer = useNavigate();
  const { pathname } = useLocation();
  const idListe = useId();
  const [saisie, setSaisie] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const [utilise, setUtilise] = useState(autoFocus);
  const champ = useRef<HTMLInputElement>(null);

  // Chargé seulement quand le champ sert : l'en-tête ne télécharge pas le catalogue sur toutes les pages.
  const { data: catalogue = [] } = useQuery({
    queryKey: ["catalogue", "", null],
    queryFn: () => chargerCatalogue({ terme: "", categorie: null }),
    enabled: utilise,
    staleTime: 5 * 60 * 1000,
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, enabled: utilise, staleTime: 60 * 60 * 1000 });
  const icones = useMemo(() => new Map(categories.map((categorie) => [categorie.slug, categorie.icone])), [categories]);
  const resultats = useMemo(() => rechercherDonnees(catalogue, saisie, langue), [catalogue, saisie, langue]);
  const terme = saisie.trim();
  const montrer = ouvert && terme.length > 0;

  const fermer = () => {
    setOuvert(false);
    setActif(-1);
    onTermine?.();
  };

  const allerAuCatalogue = () => {
    if (!terme) return;
    if (pathname === routes.accueil) window.dispatchEvent(new CustomEvent(EVENEMENT_RECHERCHE, { detail: terme }));
    else naviguer(`/?q=${encodeURIComponent(terme)}#catalog`);
    setSaisie("");
    champ.current?.blur();
    fermer();
  };

  const ouvrirDonnee = (slug: string) => {
    naviguer(routes.donnee(slug));
    setSaisie("");
    champ.current?.blur();
    fermer();
  };

  const surTouche = (evenement: KeyboardEvent<HTMLInputElement>) => {
    if (evenement.key === "ArrowDown") {
      evenement.preventDefault();
      setOuvert(true);
      setActif((indice) => Math.min(indice + 1, resultats.length));
    } else if (evenement.key === "ArrowUp") {
      evenement.preventDefault();
      setActif((indice) => Math.max(indice - 1, -1));
    } else if (evenement.key === "Enter") {
      evenement.preventDefault();
      if (actif >= 0 && actif < resultats.length) ouvrirDonnee(resultats[actif].slug);
      else allerAuCatalogue();
    } else if (evenement.key === "Escape") {
      fermer();
      champ.current?.blur();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={champ}
        type="search"
        role="combobox"
        aria-expanded={montrer}
        aria-controls={idListe}
        aria-autocomplete="list"
        aria-activedescendant={montrer && actif >= 0 ? `${idListe}-${actif}` : undefined}
        aria-label={t("navbar.rechercher")}
        placeholder={t("navbar.rechercher")}
        autoFocus={autoFocus}
        value={saisie}
        onChange={(e) => {
          setSaisie(e.target.value);
          setOuvert(true);
          setActif(-1);
        }}
        onFocus={() => {
          setUtilise(true);
          setOuvert(true);
        }}
        onBlur={() => window.setTimeout(() => setOuvert(false), 150)}
        onKeyDown={surTouche}
        // Plugin Flowbite : les « ! » remplacent son style imposé aux input ; 16 px pour éviter le zoom d'iOS.
        className="!h-10 !w-full !rounded-full !border !border-gray-200 !bg-white/90 !pe-4 !ps-10 !text-base !text-gray-900 shadow-sm !outline-none transition-colors placeholder:text-gray-400 focus:!border-emerald-500 focus:!ring-2 focus:!ring-emerald-500/20 dark:!border-white/10 dark:!bg-gray-900/80 dark:!text-white md:!text-sm"
      />

      {montrer && (
        <div
          id={idListe}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-popover text-popover-foreground shadow-xl dark:border-white/10"
        >
          {resultats.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{catalogue.length === 0 ? t("navbar.rechercheChargement") : t("navbar.aucunResultat")}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {resultats.map((donnee, indice) => (
                <li key={donnee.slug} id={`${idListe}-${indice}`} role="option" aria-selected={actif === indice}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => ouvrirDonnee(donnee.slug)}
                    onMouseEnter={() => setActif(indice)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-start", actif === indice && "bg-accent")}
                  >
                    <IconeCategorie icone={donnee.categorie_slug ? icones.get(donnee.categorie_slug) : null} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{texteTraduit(donnee.titre, langue)}</span>
                      {donnee.sources?.nom && <span className="block truncate text-xs text-muted-foreground">{donnee.sources.nom}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            id={`${idListe}-${resultats.length}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={allerAuCatalogue}
            onMouseEnter={() => setActif(resultats.length)}
            className={cn(
              "flex w-full items-center justify-between gap-2 border-t px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400",
              actif === resultats.length && "bg-accent"
            )}
          >
            <span className="truncate">{t("navbar.voirTousResultats", { terme })}</span>
            <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
};
