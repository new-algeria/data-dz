import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import maplibregl, { type MapGeoJSONFeature } from "maplibre-gl";
import type { GeoJsonObject } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslation } from "react-i18next";
import { Globe2, Layers, Loader2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EtatErreur } from "@/components/EtatErreur";
import { useChargementJSON } from "@/hooks/use-chargement-fichier";
import { formaterTaille, nomSansFormat } from "@/lib/fichiers";
import { calculerEmprise, type Emprise } from "@/lib/emprise";
import { useLangue } from "@/hooks/use-langue";
import type { Fichier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { champsLisibles, COULEUR_SANS_VALEUR, DEGRADE_VERT } from "@/lib/carte";

// Au-delà de cette taille, le globe ne se charge que si le visiteur le demande.
const SEUIL_GROS_FICHIER = 10 * 1024 * 1024;
const VERT = "#059669";

/** Fond OpenStreetMap en projection globe, avec une atmosphère qui disparaît en zoomant. */
const styleGlobe: maplibregl.StyleSpecification = {
  version: 8,
  projection: { type: "globe" },
  // Polices des étiquettes (nombre de points d'un regroupement).
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sky: {
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
  },
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: "fond", type: "background", paint: { "background-color": "#cfe8dc" } },
    { id: "osm", type: "raster", source: "osm" },
  ],
};

/** Contenu de popup construit avec textContent : les propriétés viennent de la source et ne sont jamais interprétées. */
function contenuPopup(proprietes: Record<string, unknown>, langue: string, couche?: { nom: string; couleur: string }): HTMLElement | null {
  const champs = champsLisibles(proprietes, langue);
  if (champs.length === 0 && !couche) return null;
  const conteneur = document.createElement("div");
  conteneur.className = "popup-donnee";

  if (couche) {
    const origine = document.createElement("p");
    origine.className = "popup-donnee__couche";
    origine.textContent = couche.nom;
    origine.style.color = couche.couleur;
    conteneur.appendChild(origine);
  }

  champs.forEach(([cle, valeur], indice) => {
    const ligne = document.createElement("p");
    ligne.className = indice === 0 ? "popup-donnee__titre" : "popup-donnee__champ";
    ligne.textContent = valeur;
    ligne.title = cle;
    ligne.dir = "auto";
    conteneur.appendChild(ligne);
  });
  return conteneur;
}

// Couleurs des couches superposées, lisibles sur le fond OpenStreetMap.
const COULEURS = ["#059669", "#2563eb", "#d97706", "#db2777", "#7c3aed", "#0891b2"];
// Au-delà, la superposition devient illisible : on propose seulement le choix fichier par fichier.
const MAX_SUPERPOSES = COULEURS.length;

export interface Couche {
  id: string;
  nom: string;
  couleur: string;
  donnees: GeoJsonObject;
  /** Carte des wilayas : surfaces colorées selon la propriété `valeur`, info-bulle `infobulle` au survol. */
  choroplethe?: { min: number; max: number };
}

// Au-delà, les points sont regroupés (clusters) pour rester lisibles et fluides.
const SEUIL_REGROUPEMENT = 2000;
const EMPRISE_ALGERIE: [number, number, number, number] = [-8.7, 18.9, 12, 37.2];

const nbPoints = (donnees: GeoJsonObject) =>
  "features" in donnees && Array.isArray(donnees.features)
    ? (donnees.features as { geometry?: { type?: string } | null }[]).filter((feature) => feature.geometry?.type === "Point").length
    : 0;

/** Vrai si l'emprise des données recoupe l'Algérie : on garde alors le cadrage sur l'Algérie. */
const recoupeAlgerie = ([ouest, sud, est, nord]: Emprise) =>
  ouest <= EMPRISE_ALGERIE[2] && est >= EMPRISE_ALGERIE[0] && sud <= EMPRISE_ALGERIE[3] && nord >= EMPRISE_ALGERIE[1];

/** Union des emprises des couches, ou null si aucune ne contient de coordonnées. */
function empriseGlobale(couches: Couche[]): Emprise | null {
  const emprises = couches.map((couche) => calculerEmprise(couche.donnees)).filter((e): e is Emprise => e !== null);
  if (emprises.length === 0) return null;
  return emprises.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
}

interface GlobeProps {
  couches: Couche[];
  /** Classes de hauteur du cadre (fixe dans le visuel de la fiche). */
  hauteur?: string;
  /** Légende ou sélecteurs posés sur la carte (carte des wilayas). */
  enSurimpression?: ReactNode;
  /** « mercator » : carte plane, mieux adaptée à un cadre bas centré sur l'Algérie (le bouton globe reste disponible). */
  projection?: "globe" | "mercator";
}

/**
 * Carte MapLibre (fond OpenStreetMap, projection globe), cadrée sur l'Algérie au départ.
 * Molette : zoom seulement après un clic sur la carte (la page défile normalement sinon).
 */
export const Globe = ({ couches, hauteur = "h-[30rem]", enSurimpression, projection = "globe" }: GlobeProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const conteneur = useRef<HTMLDivElement>(null);
  const refCarte = useRef<maplibregl.Map | null>(null);
  const calquesActifs = useRef<{ calques: string[]; couches: Map<string, Couche>; regroupements: string[] }>({ calques: [], couches: new Map(), regroupements: [] });
  const refLangue = useRef(langue);
  refLangue.current = langue;
  const premiereArrivee = useRef(true);
  const [prete, setPrete] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const [molette, setMolette] = useState(false);
  const mouvementReduit = useReducedMotion();

  // La carte est créée une seule fois ; changer de fichier ne fait qu'échanger ses couches.
  useEffect(() => {
    if (!conteneur.current) return;
    // Sans WebGL (vieil appareil, accélération matérielle coupée), MapLibre lève une erreur :
    // on affiche un message au lieu de laisser l'erreur faire tomber toute la fiche.
    let carte: maplibregl.Map;
    try {
      carte = new maplibregl.Map({
        container: conteneur.current,
        style: { ...styleGlobe, projection: { type: projection } },
        bounds: EMPRISE_ALGERIE,
        fitBoundsOptions: { padding: 16 },
        attributionControl: { compact: true },
        cooperativeGestures: false,
      });
    } catch (erreur) {
      console.error("carte :", erreur);
      setIndisponible(true);
      return;
    }
    carte.scrollZoom.disable();
    carte.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    carte.addControl(new maplibregl.GlobeControl(), "top-right");
    carte.addControl(new maplibregl.FullscreenControl(), "top-right");

    // Molette activée au premier clic, désactivée quand la souris quitte la carte.
    const activerMolette = () => {
      carte.scrollZoom.enable();
      setMolette(true);
    };
    const couperMolette = () => {
      carte.scrollZoom.disable();
      setMolette(false);
    };
    carte.getCanvasContainer().addEventListener("mouseleave", couperMolette);

    const infobulle = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "popup-infobulle", offset: 12 });

    carte.on("click", (evenement) => {
      activerMolette();
      const { calques, couches: parCalque, regroupements } = calquesActifs.current;
      const entite = carte.queryRenderedFeatures(evenement.point, { layers: calques })[0] as MapGeoJSONFeature | undefined;
      if (!entite) return;
      // Regroupement : on zoome dessus.
      if (regroupements.includes(entite.layer.id) && entite.geometry.type === "Point") {
        const source = carte.getSource(entite.source) as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(entite.properties.cluster_id).then((zoom) =>
          carte.easeTo({ center: entite.geometry.type === "Point" ? (entite.geometry.coordinates as [number, number]) : evenement.lngLat, zoom })
        );
        return;
      }
      const couche = parCalque.get(entite.layer.id);
      if (couche?.choroplethe) {
        if (typeof entite.properties.infobulle === "string") infobulle.setLngLat(evenement.lngLat).setText(entite.properties.infobulle).addTo(carte);
        return;
      }
      const contenu = contenuPopup(entite.properties, refLangue.current, new Set(parCalque.values()).size > 1 ? couche : undefined);
      if (!contenu) return;
      // La popup ne doit jamais être plus large que la carte, sinon elle est coupée sur mobile.
      new maplibregl.Popup({ maxWidth: `${Math.min(300, carte.getContainer().clientWidth - 32)}px`, className: "popup-globe" })
        .setLngLat(evenement.lngLat)
        .setDOMContent(contenu)
        .addTo(carte);
    });
    carte.on("mousemove", (evenement) => {
      const { calques, couches: parCalque } = calquesActifs.current;
      const entite = calques.length > 0 ? carte.queryRenderedFeatures(evenement.point, { layers: calques })[0] : undefined;
      carte.getCanvas().style.cursor = entite ? "pointer" : "";
      // Carte des wilayas : « Adrar : 88 jours » au survol.
      if (entite && parCalque.get(entite.layer.id)?.choroplethe && typeof entite.properties.infobulle === "string") {
        infobulle.setLngLat(evenement.lngLat).setText(entite.properties.infobulle).addTo(carte);
      } else {
        infobulle.remove();
      }
    });
    carte.on("mouseout", () => infobulle.remove());
    carte.on("load", () => setPrete(true));
    refCarte.current = carte;

    return () => {
      carte.getCanvasContainer().removeEventListener("mouseleave", couperMolette);
      carte.remove();
      refCarte.current = null;
      setPrete(false);
    };
    // La projection est fixée à la création de la carte (le bouton globe permet ensuite d'en changer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const carte = refCarte.current;
    if (!carte || !prete) return;

    // Retire les couches précédentes
    const style = carte.getStyle();
    style.layers.filter((calque) => calque.id.startsWith("donnees-")).forEach((calque) => carte.removeLayer(calque.id));
    Object.keys(style.sources).filter((id) => id.startsWith("donnees-")).forEach((id) => carte.removeSource(id));

    const calques: string[] = [];
    const regroupements: string[] = [];
    const parCalque = new Map<string, Couche>();
    couches.forEach((couche, indice) => {
      const source = `donnees-${indice}`;
      const regrouper = !couche.choroplethe && nbPoints(couche.donnees) > SEUIL_REGROUPEMENT;
      carte.addSource(source, {
        type: "geojson",
        data: couche.donnees as GeoJSON.GeoJSON,
        ...(regrouper ? { cluster: true, clusterRadius: 45, clusterMaxZoom: 12 } : {}),
      });
      const ajouter = (calque: maplibregl.AddLayerObject, cliquable = true) => {
        carte.addLayer(calque);
        if (cliquable) calques.push(calque.id);
        parCalque.set(calque.id, couche);
      };
      const polygones: maplibregl.FilterSpecification = ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]];

      if (couche.choroplethe) {
        const { min, max } = couche.choroplethe;
        const pas = (max - min) / (DEGRADE_VERT.length - 1) || 1;
        ajouter({
          id: `${source}-surfaces`, type: "fill", source, filter: polygones,
          paint: {
            "fill-color": [
              "case",
              ["==", ["typeof", ["get", "valeur"]], "number"],
              ["interpolate", ["linear"], ["get", "valeur"], ...DEGRADE_VERT.flatMap((couleur, rang) => [min + rang * pas, couleur])],
              COULEUR_SANS_VALEUR,
            ],
            "fill-opacity": 0.85,
          },
        });
        ajouter({ id: `${source}-contours`, type: "line", source, filter: polygones, paint: { "line-color": "#ffffff", "line-width": 0.8 } }, false);
        return;
      }

      ajouter({
        id: `${source}-surfaces`, type: "fill", source, filter: polygones,
        paint: { "fill-color": couche.couleur, "fill-opacity": couches.length > 1 ? 0.3 : 0.25 },
      });
      ajouter({
        id: `${source}-contours`, type: "line", source,
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon", "LineString", "MultiLineString"]]],
        paint: { "line-color": couche.couleur, "line-width": 1.2 },
      });
      if (regrouper) {
        ajouter({
          id: `${source}-regroupements`, type: "circle", source, filter: ["has", "point_count"],
          paint: {
            "circle-color": couche.couleur,
            "circle-opacity": 0.85,
            "circle-radius": ["step", ["get", "point_count"], 14, 50, 18, 250, 24, 1000, 30],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        regroupements.push(`${source}-regroupements`);
        ajouter(
          {
            id: `${source}-nombres`, type: "symbol", source, filter: ["has", "point_count"],
            layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Semibold"], "text-size": 12 },
            paint: { "text-color": "#ffffff" },
          },
          false
        );
      }
      ajouter({
        id: `${source}-points`, type: "circle", source,
        filter: regrouper
          ? ["all", ["!", ["has", "point_count"]], ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]]
          : ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]],
        paint: {
          "circle-color": couche.couleur,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 8, 5, 14, 8],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });
    });
    calquesActifs.current = { calques, couches: parCalque, regroupements };

    // Cadrage : l'Algérie au départ ; on ne recadre que pour des données ailleurs, ou au changement de fichier.
    const emprise = empriseGlobale(couches);
    const premiere = premiereArrivee.current;
    premiereArrivee.current = false;
    if (!emprise || (premiere && recoupeAlgerie(emprise))) return;
    carte.fitBounds(emprise, { padding: 40, maxZoom: 9, duration: mouvementReduit || premiere ? 0 : 1200, essential: false });
  }, [couches, prete, mouvementReduit]);

  if (indisponible) {
    return (
      <p className={cn("flex items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground", hauteur)}>
        {t("fiche.carteIndisponible")}
      </p>
    );
  }

  return (
    <div className="relative">
      <div
        ref={conteneur}
        className={cn("rounded-xl overflow-hidden border bg-[radial-gradient(ellipse_at_center,#0f2b22_0%,#030712_75%)]", hauteur)}
        dir="ltr"
      />
      {couches.length > 1 && (
        <ul
          className="absolute bottom-8 start-2 max-w-[60%] space-y-1 rounded-lg bg-white/90 p-2 text-xs shadow-md backdrop-blur dark:bg-gray-900/90"
          aria-label={t("fiche.legende")}
        >
          {couches.map((couche) => (
            <li key={couche.id} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: couche.couleur }} aria-hidden />
              <span className="truncate font-medium" dir="ltr">
                {couche.nom}
              </span>
            </li>
          ))}
        </ul>
      )}
      {enSurimpression}
      {!molette && (
        <p className="pointer-events-none absolute top-2 start-2 rounded-md bg-white/85 px-2 py-1 text-[11px] text-gray-700 shadow-sm backdrop-blur dark:bg-gray-900/85 dark:text-gray-200 max-sm:hidden">
          {t("visuel.aideMolette")}
        </p>
      )}
    </div>
  );
};

const TOUT = "tout";

interface GlobeDonneesProps {
  fichiers: Fichier[];
  projection?: "globe" | "mercator";
  /** Fichier affiché au départ (sinon le principal, sinon le premier). */
  initial?: string;
  hauteur?: string;
}

/** Carte des fichiers GeoJSON d'une fiche : choix du fichier affiché, ou superposition de tous. */
export const GlobeDonnees = ({ fichiers, initial, hauteur = "h-[30rem]", projection }: GlobeDonneesProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const parDefaut = initial ?? (fichiers.find((fichier) => fichier.principal) ?? fichiers[0])?.id ?? "";
  const [choix, setChoix] = useState(parDefaut);
  const [autorises, setAutorises] = useState<string[]>([]);

  const selection = choix === TOUT ? fichiers : fichiers.filter((fichier) => fichier.id === choix);
  const tailleSelection = selection.reduce((somme, fichier) => somme + (fichier.taille_octets ?? 0), 0);
  const demande = tailleSelection <= SEUIL_GROS_FICHIER || autorises.includes(choix);
  const sources = useMemo(() => selection.map((fichier) => ({ url: fichier.url, taille: fichier.taille_octets })), [choix, fichiers]); // eslint-disable-line react-hooks/exhaustive-deps
  const chargement = useChargementJSON<GeoJsonObject>(sources, demande);

  const couches = useMemo<Couche[]>(
    () =>
      chargement.statut === "termine" && chargement.donnees
        ? chargement.donnees.map((donnees, indice) => ({
            id: selection[indice].id,
            nom: nomSansFormat(selection[indice]),
            couleur: choix === TOUT ? COULEURS[fichiers.indexOf(selection[indice]) % COULEURS.length] : VERT,
            donnees,
          }))
        : [],
    [chargement.statut, chargement.donnees] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const selecteur = fichiers.length > 1 && (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
      <Select value={choix} onValueChange={setChoix}>
        <SelectTrigger className="h-9 w-auto min-w-[14rem] max-w-full" aria-label={t("fiche.carteChoix")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fichiers.length <= MAX_SUPERPOSES && <SelectItem value={TOUT}>{t("fiche.toutSuperposer", { count: fichiers.length })}</SelectItem>}
          {fichiers.map((fichier) => (
            <SelectItem key={fichier.id} value={fichier.id}>
              <span dir="ltr">{nomSansFormat(fichier)}</span>
              {fichier.taille_octets !== null && <span className="ms-2 text-xs text-muted-foreground">{formaterTaille(fichier.taille_octets, langue)}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  let contenu;
  if (!demande) {
    contenu = (
      <div className={cn("flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-dashed bg-muted/40 p-6", hauteur)}>
        <Globe2 className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground max-w-md">{t("fiche.carteGrosFichier", { taille: formaterTaille(tailleSelection, langue) })}</p>
        <Button onClick={() => setAutorises((liste) => [...liste, choix])}>{t("fiche.afficherCarte")}</Button>
      </div>
    );
  } else if (chargement.statut === "erreur") {
    contenu = <EtatErreur message={t("fiche.carteErreur")} />;
  } else if (couches.length === 0) {
    const pourcentage = chargement.octetsTotal ? Math.min(100, Math.round((chargement.octetsCharges / chargement.octetsTotal) * 100)) : null;
    contenu = (
      <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/40 p-6", hauteur)} role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden />
        <p className="text-sm">{t("fiche.carteChargement")}</p>
        {pourcentage !== null && <Progress value={pourcentage} className="w-full max-w-sm" />}
        {chargement.octetsCharges > 0 && (
          <p className="text-xs text-muted-foreground">
            {chargement.octetsTotal
              ? t("fiche.carteProgression", { charge: formaterTaille(chargement.octetsCharges, langue), total: formaterTaille(chargement.octetsTotal, langue) })
              : formaterTaille(chargement.octetsCharges, langue)}
          </p>
        )}
      </div>
    );
  } else {
    contenu = <Globe couches={couches} hauteur={hauteur} projection={projection} />;
  }

  return (
    <div>
      {selecteur}
      {contenu}
    </div>
  );
};

export default GlobeDonnees;
