import { useEffect, useRef, useState } from "react";
import maplibregl, { type MapGeoJSONFeature } from "maplibre-gl";
import type { GeoJsonObject } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslation } from "react-i18next";
import { Globe2, Loader2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EtatErreur } from "@/components/EtatErreur";
import { useChargementJSON } from "@/hooks/use-chargement-fichier";
import { formaterTaille, urlFichier } from "@/lib/fichiers";
import { calculerEmprise } from "@/lib/emprise";
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
function contenuPopup(proprietes: Record<string, unknown>): HTMLElement {
  const conteneur = document.createElement("div");
  conteneur.className = "popup-donnee";

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

const Globe = ({ donnees }: { donnees: GeoJsonObject }) => {
  const { t } = useTranslation();
  const conteneur = useRef<HTMLDivElement>(null);
  const mouvementReduit = useReducedMotion();

  useEffect(() => {
    if (!conteneur.current) return;
    const emprise = calculerEmprise(donnees);
    let minuteurArrivee: ReturnType<typeof setTimeout> | undefined;

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

    carte.on("load", () => {
      carte.addSource("donnees", { type: "geojson", data: donnees as GeoJSON.GeoJSON });
      carte.addLayer({
        id: "surfaces",
        type: "fill",
        source: "donnees",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "fill-color": VERT, "fill-opacity": 0.25 },
      });
      carte.addLayer({
        id: "contours",
        type: "line",
        source: "donnees",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon", "LineString", "MultiLineString"]]],
        paint: { "line-color": "#047857", "line-width": 1.2 },
      });
      carte.addLayer({
        id: "points",
        type: "circle",
        source: "donnees",
        filter: ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]],
        paint: {
          "circle-color": "#10b981",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 8, 5, 14, 8],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });

      const calquesCliquables = ["surfaces", "contours", "points"];
      carte.on("click", calquesCliquables, (evenement) => {
        const entite = evenement.features?.[0] as MapGeoJSONFeature | undefined;
        if (!entite || Object.keys(entite.properties).length === 0) return;
        // La popup ne doit jamais être plus large que le globe, sinon elle est coupée sur mobile.
        new maplibregl.Popup({
          maxWidth: `${Math.min(340, carte.getContainer().clientWidth - 32)}px`,
          className: "popup-globe",
        })
          .setLngLat(evenement.lngLat)
          .setDOMContent(contenuPopup(entite.properties))
          .addTo(carte);
      });
      calquesCliquables.forEach((calque) => {
        carte.on("mouseenter", calque, () => (carte.getCanvas().style.cursor = "pointer"));
        carte.on("mouseleave", calque, () => (carte.getCanvas().style.cursor = ""));
      });

      // Arrivée depuis l'espace : le globe pivote puis zoome sur l'emprise des données.
      if (emprise) {
        minuteurArrivee = setTimeout(
          () => carte.fitBounds(emprise, { padding: 40, maxZoom: 9, duration: mouvementReduit ? 0 : 3500, essential: false }),
          mouvementReduit ? 0 : 600
        );
      }
    });

    return () => {
      clearTimeout(minuteurArrivee);
      carte.remove();
    };
  }, [donnees, mouvementReduit]);

  return (
    <div className="space-y-2">
      <div
        ref={conteneur}
        className="h-[30rem] rounded-xl overflow-hidden border bg-[radial-gradient(ellipse_at_center,#0f2b22_0%,#030712_75%)]"
        dir="ltr"
      />
      <p className="text-xs text-muted-foreground">{t("fiche.globeAide")}</p>
    </div>
  );
};

export const GlobeDonnees = ({ fichier }: { fichier: Fichier }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const grosFichier = (fichier.taille_octets ?? 0) > SEUIL_GROS_FICHIER;
  const [demande, setDemande] = useState(!grosFichier);
  const chargement = useChargementJSON<GeoJsonObject>(urlFichier(fichier.cle_stockage), demande, fichier.taille_octets);

  if (!demande) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 h-72 rounded-xl border border-dashed bg-muted/40 p-6">
        <Globe2 className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground max-w-md">
          {t("fiche.carteGrosFichier", { taille: formaterTaille(fichier.taille_octets, langue) })}
        </p>
        <Button onClick={() => setDemande(true)}>{t("fiche.afficherCarte")}</Button>
      </div>
    );
  }

  if (chargement.statut === "erreur") {
    return <EtatErreur message={t("fiche.carteErreur")} />;
  }

  if (chargement.statut !== "termine" || !chargement.donnees) {
    const pourcentage = chargement.octetsTotal
      ? Math.min(100, Math.round((chargement.octetsCharges / chargement.octetsTotal) * 100))
      : null;
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 h-72 rounded-xl border bg-muted/40 p-6"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden />
        <p className="text-sm">{t("fiche.carteChargement")}</p>
        {pourcentage !== null && <Progress value={pourcentage} className="w-full max-w-sm" />}
        {chargement.octetsCharges > 0 && (
          <p className="text-xs text-muted-foreground">
            {chargement.octetsTotal
              ? t("fiche.carteProgression", {
                  charge: formaterTaille(chargement.octetsCharges, langue),
                  total: formaterTaille(chargement.octetsTotal, langue),
                })
              : formaterTaille(chargement.octetsCharges, langue)}
          </p>
        )}
      </div>
    );
  }

  return <Globe donnees={chargement.donnees} />;
};

export default GlobeDonnees;
