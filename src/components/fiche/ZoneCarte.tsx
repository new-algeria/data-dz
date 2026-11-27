import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import type { Feature, FeatureCollection, Geometry, GeoJsonObject, MultiPolygon, Polygon } from "geojson";
import { Building2, Loader2, MapPin, Search, X } from "lucide-react";
import { useChargementJSON } from "@/hooks/use-chargement-fichier";
import { useLangue } from "@/hooks/use-langue";
import { chargerFicheDonnee } from "@/lib/catalogue";
import { chargerWilayas } from "@/lib/referentiels";
import {
  chercherZones,
  codeDeuxChiffres,
  communesDepuisListe,
  contourDepuisSurfaces,
  filtrerDansZone,
  identifiantZone,
  masqueHorsZone,
  nombrePoints,
  nomZone,
  surfacesDeZone,
  zoneDepuisIdentifiant,
  type CommuneBrute,
  type Zone,
  type ZoneWilaya,
} from "@/lib/zones-carte";
import type { Couche, ZoneAffichee } from "@/components/fiche/GlobeDonnees";
import { cn } from "@/lib/utils";

const SLUG_DIVISIONS = "divisions-administratives";
export const PARAMETRE_ZONE = "zone";

/** Fichier publié de `divisions-administratives` (« communes », « 16 », « wilaya-boundaries »…). */
function useFichierDivisions(nom: string | null, format: "json" | "geojson", actif: boolean) {
  const fiche = useQuery({ queryKey: ["fiche", SLUG_DIVISIONS], queryFn: () => chargerFicheDonnee(SLUG_DIVISIONS), staleTime: Infinity, enabled: actif });
  const fichier = nom
    ? fiche.data?.versions?.fichiers?.find((element) => element.format.toLowerCase() === format && (element.nom ?? "").toLowerCase() === nom)
    : undefined;
  const sources = useMemo(() => (fichier ? [{ url: fichier.url, taille: fichier.taille_octets }] : []), [fichier]);
  const chargement = useChargementJSON<unknown>(sources, actif && Boolean(fichier));
  return {
    donnees: chargement.statut === "termine" ? chargement.donnees?.[0] ?? null : null,
    erreur: fiche.isError || chargement.statut === "erreur" || (fiche.isSuccess && Boolean(nom) && !fichier),
  };
}

interface OptionsZone {
  couches: Couche[];
  /** Nom de ce qu'on compte (« pharmacies »), d'après le titre de la donnée. */
  unite: string;
  /** Données OpenStreetMap : le nombre est une estimation. */
  estimee: boolean;
  /** Sans recherche (carte hors du visuel) : les couches passent telles quelles. */
  active?: boolean;
}

/**
 * Recherche d'une wilaya ou d'une commune sur la carte : la carte se cadre sur la zone, le reste est grisé et seuls
 * les points de la zone restent affichés, avec leur nombre. La zone est gardée dans l'adresse (`?zone=16-bab-ezzouar`).
 */
export function useZoneCarte({ couches, unite, estimee, active = true }: OptionsZone) {
  const langue = useLangue();
  const [parametres, setParametres] = useSearchParams();
  // Seulement sur une carte à points (pas sur une carte colorée des wilayas).
  const avecPoints = active && couches.some((couche) => !couche.choroplethe && nombrePoints(couche.donnees as GeoJsonObject) > 0);
  const identifiant = avecPoints ? parametres.get(PARAMETRE_ZONE) : null;
  const [actif, setActif] = useState(Boolean(identifiant));
  useEffect(() => {
    if (identifiant) setActif(true);
  }, [identifiant]);

  const { data: listeWilayas = [] } = useQuery({ queryKey: ["wilayas"], queryFn: chargerWilayas, staleTime: Infinity, enabled: actif });
  const wilayas = useMemo<ZoneWilaya[]>(
    () => listeWilayas.filter((wilaya) => wilaya.nom.fr).map((wilaya) => ({ type: "wilaya", code: wilaya.code, nom: { fr: wilaya.nom.fr, ar: wilaya.nom.ar } })),
    [listeWilayas]
  );
  const fichierCommunes = useFichierDivisions("communes", "json", actif);
  const communes = useMemo(() => {
    const brut = fichierCommunes.donnees;
    const liste = Array.isArray(brut) ? brut : Array.isArray((brut as { data?: unknown })?.data) ? (brut as { data: unknown[] }).data : [];
    return communesDepuisListe(liste as CommuneBrute[]);
  }, [fichierCommunes.donnees]);

  const zone = useMemo(() => zoneDepuisIdentifiant(identifiant, wilayas, communes), [identifiant, wilayas, communes]);

  // Polygones des communes de la wilaya choisie (« 16 » → fichier « 16 »), et tracé simplifié des wilayas.
  const fichierWilaya = useFichierDivisions(zone ? String(Number(zone.code)) : null, "geojson", Boolean(zone));
  const contoursWilayas = useFichierDivisions(zone?.type === "wilaya" ? "wilaya-boundaries" : null, "geojson", zone?.type === "wilaya");

  const contour = useMemo(() => {
    const collection = fichierWilaya.donnees as FeatureCollection | null;
    if (!zone || !collection?.features) return null;
    return contourDepuisSurfaces(surfacesDeZone(collection, zone), zone.type === "wilaya" ? zone.code : undefined);
  }, [zone, fichierWilaya.donnees]);

  const filtrage = useMemo(() => {
    if (!contour) return null;
    let points = 0;
    const filtrees = couches.map((couche) => {
      const resultat = filtrerDansZone(couche.donnees as GeoJsonObject, contour);
      points += resultat.points;
      return { ...couche, donnees: resultat.donnees };
    });
    return { couches: filtrees, points };
  }, [couches, contour]);

  const zoneAffichee = useMemo<ZoneAffichee | null>(() => {
    if (!contour || !zone) return null;
    // Tracé : le contour de la wilaya (sans les limites des communes), sinon celui de la commune.
    let trace: Feature<Geometry>[] = contour.surfaces.map((geometry) => ({ type: "Feature", properties: {}, geometry }));
    const collection = contoursWilayas.donnees as FeatureCollection | null;
    if (zone.type === "wilaya" && collection?.features) {
      const wilaya = collection.features.filter((feature) => {
        const proprietes = feature.properties ?? {};
        return codeDeuxChiffres(proprietes.code ?? proprietes.wilaya_code ?? proprietes.code_wilaya ?? proprietes.id) === zone.code;
      });
      if (wilaya.length > 0) trace = wilaya;
    }
    // Le voile est percé par le seul tracé (une wilaya d'un bloc, sans les limites de ses communes).
    const surfacesTrace = trace
      .map((feature) => feature.geometry)
      .filter((geometrie): geometrie is Polygon | MultiPolygon => geometrie?.type === "Polygon" || geometrie?.type === "MultiPolygon");
    const masque = masqueHorsZone(contourDepuisSurfaces(surfacesTrace) ?? contour);
    return { cle: identifiantZone(zone), masque, trace: { type: "FeatureCollection", features: trace }, boite: contour.boite };
  }, [contour, zone, contoursWilayas.donnees]);

  const choisir = (nouvelle: Zone | null) => {
    setParametres(
      (actuels) => {
        const suivants = new URLSearchParams(actuels);
        if (nouvelle) suivants.set(PARAMETRE_ZONE, identifiantZone(nouvelle));
        else suivants.delete(PARAMETRE_ZONE);
        return suivants;
      },
      { replace: true, preventScrollReset: true }
    );
  };

  const chargementZone = Boolean(zone) && !contour && !fichierWilaya.erreur;
  const barre = (
    <BarreZone
      zone={zone}
      wilayas={wilayas}
      communes={communes}
      chargementListe={actif && communes.length === 0 && !fichierCommunes.erreur}
      chargementZone={chargementZone}
      erreurZone={Boolean(zone) && fichierWilaya.erreur}
      points={filtrage?.points ?? null}
      unite={unite}
      estimee={estimee}
      langue={langue}
      onActiver={() => setActif(true)}
      onChoisir={choisir}
    />
  );

  return { couches: filtrage?.couches ?? couches, zone: zoneAffichee, barre: avecPoints ? barre : null };
}

interface BarreZoneProps {
  zone: Zone | null;
  wilayas: ZoneWilaya[];
  communes: ReturnType<typeof communesDepuisListe>;
  chargementListe: boolean;
  chargementZone: boolean;
  erreurZone: boolean;
  points: number | null;
  unite: string;
  estimee: boolean;
  langue: string;
  onActiver: () => void;
  onChoisir: (zone: Zone | null) => void;
}

const BarreZone = ({ zone, wilayas, communes, chargementListe, chargementZone, erreurZone, points, unite, estimee, langue, onActiver, onChoisir }: BarreZoneProps) => {
  const { t } = useTranslation();
  const idListe = useId();
  const [terme, setTerme] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const champ = useRef<HTMLInputElement>(null);
  const format = useMemo(() => new Intl.NumberFormat(langue === "ar" ? "ar-DZ" : langue), [langue]);

  const resultats = useMemo(() => chercherZones(terme, wilayas, communes), [terme, wilayas, communes]);
  useEffect(() => setActif(0), [terme]);

  const valider = (choix: Zone) => {
    onChoisir(choix);
    setTerme("");
    setOuvert(false);
    champ.current?.blur();
  };

  // Zone choisie : pastille avec le nom, le nombre de points et une croix.
  if (zone) {
    const nom = nomZone(zone.nom, langue);
    const sousTitre = zone.type === "commune" ? nomZone(zone.nomWilaya, langue) : t("zoneCarte.wilaya", { code: zone.code });
    return (
      <div className="pointer-events-auto flex max-w-[min(22rem,100%)] items-center gap-2.5 rounded-2xl border border-white/60 bg-white/95 py-2 pe-2 ps-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-gray-900/95">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          {zone.type === "wilaya" ? <MapPin className="h-4 w-4" aria-hidden /> : <Building2 className="h-4 w-4" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="truncate text-sm font-semibold leading-tight" dir="auto">
            {nom} <span className="font-normal text-muted-foreground">· {sousTitre}</span>
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {erreurZone ? (
              t("zoneCarte.erreur")
            ) : chargementZone || points === null ? (
              t("zoneCarte.chargement")
            ) : (
              <>
                <span className="text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{format.format(points)}</span>{" "}
                {unite}
                {estimee && ` · ${t("zoneCarte.estimes")}`}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChoisir(null)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("zoneCarte.effacer")}
          title={t("zoneCarte.effacer")}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto relative w-[min(19rem,100%)]">
      <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/95 ps-3.5 shadow-lg backdrop-blur transition focus-within:ring-2 focus-within:ring-emerald-500/60 dark:border-white/10 dark:bg-gray-900/95">
        <Search className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
        <input
          ref={champ}
          type="search"
          value={terme}
          onChange={(evenement) => {
            setTerme(evenement.target.value);
            setOuvert(true);
          }}
          onFocus={() => {
            onActiver();
            setOuvert(true);
          }}
          onBlur={() => window.setTimeout(() => setOuvert(false), 150)}
          onKeyDown={(evenement) => {
            if (evenement.key === "ArrowDown") {
              evenement.preventDefault();
              setActif((indice) => Math.min(indice + 1, resultats.length - 1));
            } else if (evenement.key === "ArrowUp") {
              evenement.preventDefault();
              setActif((indice) => Math.max(indice - 1, 0));
            } else if (evenement.key === "Enter" && resultats[actif]) {
              evenement.preventDefault();
              valider(resultats[actif]);
            } else if (evenement.key === "Escape") {
              setOuvert(false);
            }
          }}
          placeholder={t("zoneCarte.placeholder")}
          aria-label={t("zoneCarte.placeholder")}
          role="combobox"
          aria-expanded={ouvert && resultats.length > 0}
          aria-controls={idListe}
          aria-autocomplete="list"
          className="h-10 w-full min-w-0 !border-0 !bg-transparent !p-0 pe-3 text-base !shadow-none !outline-none !ring-0 placeholder:text-muted-foreground sm:text-sm"
        />
        {chargementListe && ouvert && <Loader2 className="me-3 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />}
      </div>

      {ouvert && terme.trim() && (
        <ul
          id={idListe}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          {resultats.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">{chargementListe ? t("zoneCarte.chargement") : t("zoneCarte.aucun")}</li>
          ) : (
            resultats.map((resultat, indice) => (
              <li key={`${resultat.type}-${identifiantZone(resultat)}`} role="option" aria-selected={indice === actif}>
                <button
                  type="button"
                  onMouseDown={(evenement) => evenement.preventDefault()}
                  onClick={() => valider(resultat)}
                  onMouseEnter={() => setActif(indice)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition",
                    indice === actif ? "bg-emerald-50 dark:bg-emerald-900/30" : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      resultat.type === "wilaya" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    )}
                    aria-hidden
                  >
                    {resultat.type === "wilaya" ? resultat.code : <Building2 className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium" dir="auto">
                      {nomZone(resultat.nom, langue)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground" dir="auto">
                      {resultat.type === "wilaya" ? t("zoneCarte.wilaya", { code: resultat.code }) : t("zoneCarte.commune", { wilaya: nomZone(resultat.nomWilaya, langue) })}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
