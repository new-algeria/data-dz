import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AvatarMembre } from "@/components/AvatarMembre";
import { IconeCategorie } from "@/components/BadgeCategorie";
import { chargerCatalogue, chargerCategories } from "@/lib/catalogue";
import { LONGUEUR_MIN_RECHERCHE_MEMBRE, nettoyerRechercheMembre, rechercherMembres } from "@/lib/profils";
import { rechercherDonnees } from "@/lib/recherche-rapide";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { useValeurDifferee } from "@/hooks/use-valeur-differee";
import { cn } from "@/lib/utils";

/** Intitulé d'un groupe de résultats (« Données », « Membres »). */
const TitreGroupe = ({ children }: { children: string }) => (
  <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" aria-hidden>
    {children}
  </p>
);

/** Évènement écouté par l'accueil : remplit la recherche du catalogue sans recharger la page. */
export const EVENEMENT_RECHERCHE = "data-dz:rechercher";

/**
 * Recherche de l'en-tête : résultats sous le champ pendant la frappe (catalogue déjà chargé, même clé React Query
 * que l'accueil), flèches et Entrée au clavier ; Entrée sans choix → catalogue filtré (`?q=`).
 */
export const RechercheNavbar = ({
  autoFocus = false,
  onTermine,
  className,
  variante = "entete",
  placeholder,
  ariaLabel,
  onRechercher,
}: {
  autoFocus?: boolean;
  onTermine?: () => void;
  className?: string;
  variante?: "entete" | "hero";
  placeholder?: string;
  ariaLabel?: string;
  onRechercher?: (terme: string) => void;
}) => {
  const estHero = variante === "hero";
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
  // Membres : interrogés dans la base, 300 ms après la dernière frappe et à partir de 2 caractères.
  const termeMembres = useValeurDifferee(nettoyerRechercheMembre(terme));
  const { data: membres = [] } = useQuery({
    queryKey: ["recherche-membres", termeMembres],
    queryFn: () => rechercherMembres(termeMembres),
    enabled: utilise && termeMembres.length >= LONGUEUR_MIN_RECHERCHE_MEMBRE,
    staleTime: 60 * 1000,
  });
  const membresAffiches = termeMembres.length >= LONGUEUR_MIN_RECHERCHE_MEMBRE ? membres : [];
  // Une seule liste pour le clavier : données, puis membres, puis « Voir tous les résultats ».
  const nbOptions = resultats.length + membresAffiches.length;
  const montrer = ouvert && terme.length > 0;

  const fermer = () => {
    setOuvert(false);
    setActif(-1);
    onTermine?.();
  };

  const allerAuCatalogue = () => {
    if (!terme) return;
    if (onRechercher) onRechercher(terme);
    else if (pathname === routes.accueil) window.dispatchEvent(new CustomEvent(EVENEMENT_RECHERCHE, { detail: terme }));
    else naviguer(`/?q=${encodeURIComponent(terme)}#catalog`);
    setSaisie("");
    champ.current?.blur();
    fermer();
  };

  const ouvrirMembre = (pseudo: string) => {
    naviguer(routes.membre(pseudo));
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
      setActif((indice) => Math.min(indice + 1, nbOptions));
    } else if (evenement.key === "ArrowUp") {
      evenement.preventDefault();
      setActif((indice) => Math.max(indice - 1, -1));
    } else if (evenement.key === "Enter") {
      evenement.preventDefault();
      if (actif >= 0 && actif < resultats.length) ouvrirDonnee(resultats[actif].slug);
      else if (actif >= resultats.length && actif < nbOptions) ouvrirMembre(membresAffiches[actif - resultats.length].pseudo);
      else allerAuCatalogue();
    } else if (evenement.key === "Escape") {
      fermer();
      champ.current?.blur();
    }
  };

  return (
    <div
      role={estHero ? "search" : undefined}
      aria-label={estHero ? ariaLabel : undefined}
      className={cn("relative w-full", estHero && "rounded-xl", className)}
    >
      <Search className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground", estHero ? "start-4" : "start-3.5")} aria-hidden />
      <input
        ref={champ}
        type="search"
        role="combobox"
        aria-expanded={montrer}
        aria-controls={idListe}
        aria-autocomplete="list"
        aria-activedescendant={montrer && actif >= 0 ? `${idListe}-${actif}` : undefined}
        aria-label={ariaLabel ?? t("navbar.rechercher")}
        placeholder={placeholder ?? t("navbar.rechercher")}
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
        className={cn(
          "!w-full !rounded-full !border !border-gray-200 !bg-white/90 !text-base !text-gray-900 shadow-sm !outline-none transition-colors placeholder:text-gray-400 focus:!border-emerald-500 focus:!ring-2 focus:!ring-emerald-500/20 dark:!border-white/10 dark:!bg-gray-900/80 dark:!text-white md:!text-sm",
          estHero ? "!h-11 !pe-12 !ps-12 !py-2" : "!h-10 !pe-4 !ps-10"
        )}
      />
      {estHero && (
        <button
          type="button"
          onClick={allerAuCatalogue}
          aria-label={t("accueil.recherche.bouton")}
          className="absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-700 text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
      )}

      {montrer && (
        <div
          id={idListe}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-popover text-popover-foreground shadow-xl dark:border-white/10"
        >
          {nbOptions === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{catalogue.length === 0 ? t("navbar.rechercheChargement") : t("navbar.aucunResultat")}</p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {resultats.length > 0 && (
                <>
                  {membresAffiches.length > 0 && <TitreGroupe>{t("navbar.groupeDonnees")}</TitreGroupe>}
                  <ul>
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
                </>
              )}
              {membresAffiches.length > 0 && (
                <>
                  <TitreGroupe>{t("navbar.groupeMembres")}</TitreGroupe>
                  <ul>
                    {membresAffiches.map((membre, position) => {
                      const indice = resultats.length + position;
                      return (
                        <li key={membre.pseudo} id={`${idListe}-${indice}`} role="option" aria-selected={actif === indice}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => ouvrirMembre(membre.pseudo)}
                            onMouseEnter={() => setActif(indice)}
                            className={cn("flex w-full items-center gap-3 px-4 py-2 text-start", actif === indice && "bg-accent")}
                          >
                            <AvatarMembre profil={membre} className="h-8 w-8 text-xs" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium" dir="auto">
                                {membre.nom_affiche || membre.pseudo}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                                @{membre.pseudo}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
          <button
            type="button"
            id={`${idListe}-${nbOptions}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={allerAuCatalogue}
            onMouseEnter={() => setActif(nbOptions)}
            className={cn(
              "flex w-full items-center justify-between gap-2 border-t px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400",
              actif === nbOptions && "bg-accent"
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
