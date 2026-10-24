import { useEffect, useMemo, useRef, useState } from "react";
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
import { valeurEnTexte } from "@/lib/valeurs";
import type { Fichier } from "@/lib/types";

// Au-delà de cette taille, le globe ne se charge que si le visiteur le demande.
const SEUIL_GROS_FICHIER = 10 * 1024 * 1024;
const VERT = "#059669";

/** Fond OpenStreetMap en projection globe, avec une atmosphère qui disparaît en zoomant. */
const styleGlobe: maplibregl.StyleSpecification = {
  version: 8,
  projection: { type: "globe" },
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

// Propriétés utilisées comme titre de la popup, par ordre de préférence.
const CLES_TITRE = ["nom", "name", "name_fr", "nom_fr", "titre", "label"];

/** Contenu de popup construit avec textContent : les propriétés viennent de la source et ne sont jamais interprétées. */
function contenuPopup(proprietes: Record<string, unknown>, couche?: { nom: string; couleur: string }): HTMLElement {
  const conteneur = document.createElement("div");
  conteneur.className = "popup-donnee";

  if (couche) {
    const origine = document.createElement("p");
    origine.className = "popup-donnee__couche";
    origine.textContent = couche.nom;
    origine.style.color = couche.couleur;
    conteneur.appendChild(origine);
  }

  const cleTitre = CLES_TITRE.find((cle) => typeof proprietes[cle] === "string" && proprietes[cle]);
  if (cleTitre) {
    const titre = document.createElement("p");
    titre.className = "popup-donnee__titre";
    titre.textContent = String(proprietes[cleTitre]);
    titre.dir = "auto";
    conteneur.appendChild(titre);
  }

  const liste = document.createElement("dl");
  liste.className = "popup-donnee__liste";
  Object.entries(proprietes)
    .filter(([cle, valeur]) => cle !== cleTitre && valeur !== null && valeur !== "")
    .slice(0, 20)
    .forEach(([cle, valeur]) => {
      const terme = document.createElement("dt");
      terme.textContent = cle;
      const definition = document.createElement("dd");
      definition.textContent = valeurEnTexte(valeur, 120);
      definition.dir = "auto";
      liste.append(terme, definition);
    });
  conteneur.appendChild(liste);
  return conteneur;
}

// Couleurs des couches superposées, lisibles sur le fond OpenStreetMap.
const COULEURS = ["#059669", "#2563eb", "#d97706", "#db2777", "#7c3aed", "#0891b2"];
// Au-delà, la superposition devient illisible : on propose seulement le choix fichier par fichier.
const MAX_SUPERPOSES = COULEURS.length;

interface Couche {
  id: string;
  nom: string;
  couleur: string;
  donnees: GeoJsonObject;
}

/** Union des emprises des couches, ou null si aucune ne contient de coordonnées. */
function empriseGlobale(couches: Couche[]): Emprise | null {
  const emprises = couches.map((couche) => calculerEmprise(couche.donnees)).filter((e): e is Emprise => e !== null);
  if (emprises.length === 0) return null;
  return emprises.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
}

const Globe = ({ couches }: { couches: Couche[] }) => {
  const { t } = useTranslation();
  const conteneur = useRef<HTMLDivElement>(null);
  const refCarte = useRef<maplibregl.Map | null>(null);
  const calquesActifs = useRef<{ calques: string[]; couches: Map<string, Couche> }>({ calques: [], couches: new Map() });
  const premiereArrivee = useRef(true);
  const [prete, setPrete] = useState(false);
  const mouvementReduit = useReducedMotion();

  // La carte est créée une seule fois ; changer de fichier ne fait qu'échanger ses couches.
  useEffect(() => {
    if (!conteneur.current) return;
    const carte = new maplibregl.Map({
      container: conteneur.current,
      style: styleGlobe,
      // Vue de départ : la Terre entière, légèrement décalée pour que le globe pivote vers les données.
      center: mouvementReduit ? [3, 28] : [-35, 18],
      zoom: 0.8,
      attributionControl: { compact: true },
      cooperativeGestures: false,
    });
    carte.scrollZoom.disable();
    carte.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    carte.addControl(new maplibregl.GlobeControl(), "top-right");
    carte.addControl(new maplibregl.FullscreenControl(), "top-right");

    carte.on("click", (evenement) => {
      const { calques, couches: parCalque } = calquesActifs.current;
      const entite = carte.queryRenderedFeatures(evenement.point, { layers: calques })[0] as MapGeoJSONFeature | undefined;
      if (!entite || Object.keys(entite.properties).length === 0) return;
      const couche = parCalque.get(entite.layer.id);
      // La popup ne doit jamais être plus large que le globe, sinon elle est coupée sur mobile.
      new maplibregl.Popup({ maxWidth: `${Math.min(340, carte.getContainer().clientWidth - 32)}px`, className: "popup-globe" })
        .setLngLat(evenement.lngLat)
        .setDOMContent(contenuPopup(entite.properties, new Set(parCalque.values()).size > 1 ? couche : undefined))
        .addTo(carte);
    });
    carte.on("mousemove", (evenement) => {
      const { calques } = calquesActifs.current;
      const survol = calques.length > 0 && carte.queryRenderedFeatures(evenement.point, { layers: calques }).length > 0;
      carte.getCanvas().style.cursor = survol ? "pointer" : "";
    });
    carte.on("load", () => setPrete(true));
    refCarte.current = carte;

    return () => {
      carte.remove();
      refCarte.current = null;
      setPrete(false);
    };
  }, [mouvementReduit]);

  useEffect(() => {
    const carte = refCarte.current;
    if (!carte || !prete) return;

    // Retire les couches précédentes
    const style = carte.getStyle();
    style.layers.filter((calque) => calque.id.startsWith("donnees-")).forEach((calque) => carte.removeLayer(calque.id));
    Object.keys(style.sources).filter((id) => id.startsWith("donnees-")).forEach((id) => carte.removeSource(id));

    const calques: string[] = [];
    const parCalque = new Map<string, Couche>();
    couches.forEach((couche, indice) => {
      const source = `donnees-${indice}`;
      carte.addSource(source, { type: "geojson", data: couche.donnees as GeoJSON.GeoJSON });
      const ajouter = (calque: maplibregl.AddLayerObject) => {
        carte.addLayer(calque);
        calques.push(calque.id);
        parCalque.set(calque.id, couche);
      };
      ajouter({
        id: `${source}-surfaces`, type: "fill", source,
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "fill-color": couche.couleur, "fill-opacity": couches.length > 1 ? 0.3 : 0.25 },
      });
      ajouter({
        id: `${source}-contours`, type: "line", source,
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon", "LineString", "MultiLineString"]]],
        paint: { "line-color": couche.couleur, "line-width": 1.2 },
      });
      ajouter({
        id: `${source}-points`, type: "circle", source,
        filter: ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]],
        paint: {
          "circle-color": couche.couleur,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 8, 5, 14, 8],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });
    });
    calquesActifs.current = { calques, couches: parCalque };

    // Première arrivée : le globe pivote depuis l'espace ; ensuite, simple recadrage sur le fichier choisi.
    const emprise = empriseGlobale(couches);
    if (!emprise) return;
    const premiere = premiereArrivee.current;
    premiereArrivee.current = false;
    const minuteur = setTimeout(
      () => carte.fitBounds(emprise, { padding: 40, maxZoom: 9, duration: mouvementReduit ? 0 : premiere ? 3500 : 1200, essential: false }),
      premiere && !mouvementReduit ? 600 : 0
    );
    return () => clearTimeout(minuteur);
  }, [couches, prete, mouvementReduit]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={conteneur}
          className="h-[30rem] rounded-xl overflow-hidden border bg-[radial-gradient(ellipse_at_center,#0f2b22_0%,#030712_75%)]"
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
      </div>
      <p className="text-xs text-muted-foreground">{t("fiche.globeAide")}</p>
    </div>
  );
};

const TOUT = "tout";

/** Globe des fichiers GeoJSON d'une fiche : choix du fichier affiché, ou superposition de tous. */
export const GlobeDonnees = ({ fichiers }: { fichiers: Fichier[] }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const parDefaut = (fichiers.find((fichier) => fichier.principal) ?? fichiers[0])?.id ?? "";
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
      <div className="flex flex-col items-center justify-center text-center gap-3 h-72 rounded-xl border border-dashed bg-muted/40 p-6">
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
      <div className="flex flex-col items-center justify-center gap-3 h-72 rounded-xl border bg-muted/40 p-6" role="status" aria-live="polite">
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
    contenu = <Globe couches={couches} />;
  }

  return (
    <div>
      {selecteur}
      {contenu}
    </div>
  );
};

export default GlobeDonnees;
