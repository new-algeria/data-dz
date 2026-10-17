import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { Loader2, Map as IconeCarte } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EtatErreur } from "@/components/EtatErreur";
import { useChargementJSON } from "@/hooks/use-chargement-fichier";
import { formaterTaille, urlFichier } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import { valeurEnTexte } from "@/lib/valeurs";
import type { Fichier } from "@/lib/types";

// Au-delà de cette taille, la carte ne se charge que si le visiteur le demande.
const SEUIL_GROS_FICHIER = 10 * 1024 * 1024;
const CENTRE_ALGERIE: L.LatLngExpression = [28.0, 2.6];

/** Popup construite avec textContent : les propriétés viennent de la source et ne sont jamais interprétées en HTML. */
function contenuPopup(feature: Feature): HTMLElement {
  const tableau = document.createElement("table");
  tableau.className = "text-xs";
  Object.entries(feature.properties ?? {})
    .slice(0, 15)
    .forEach(([cle, valeur]) => {
      const ligne = tableau.insertRow();
      const cellCle = ligne.insertCell();
      cellCle.textContent = cle;
      cellCle.style.fontWeight = "600";
      cellCle.style.paddingInlineEnd = "8px";
      cellCle.style.verticalAlign = "top";
      const cellValeur = ligne.insertCell();
      cellValeur.textContent = valeurEnTexte(valeur, 80);
      cellValeur.dir = "auto";
    });
  return tableau;
}

const AjusterVue = ({ couche }: { couche: React.RefObject<L.GeoJSON> }) => {
  const carte = useMap();
  useEffect(() => {
    const limites = couche.current?.getBounds();
    if (limites?.isValid()) carte.fitBounds(limites, { padding: [16, 16] });
  }, [carte, couche]);
  return null;
};

const style = { color: "#059669", weight: 1.5, fillOpacity: 0.25 };

export const CarteGeoJSON = ({ fichier }: { fichier: Fichier }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const grosFichier = (fichier.taille_octets ?? 0) > SEUIL_GROS_FICHIER;
  const [demande, setDemande] = useState(!grosFichier);
  const couche = useRef<L.GeoJSON>(null);

  const url = urlFichier(fichier.cle_stockage);
  const chargement = useChargementJSON<GeoJsonObject>(url, demande, fichier.taille_octets);

  const options = useMemo(
    () => ({
      pointToLayer: (_: Feature, position: L.LatLng) =>
        L.circleMarker(position, { radius: 5, color: "#047857", weight: 1, fillColor: "#10b981", fillOpacity: 0.8 }),
      onEachFeature: (feature: Feature, calque: L.Layer) => {
        if (feature.properties && Object.keys(feature.properties).length > 0) {
          calque.bindPopup(() => contenuPopup(feature));
        }
      },
    }),
    []
  );

  if (!demande) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 h-72 rounded-md border border-dashed bg-muted/40 p-6">
        <IconeCarte className="h-10 w-10 text-muted-foreground" aria-hidden />
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
        className="flex flex-col items-center justify-center gap-3 h-72 rounded-md border bg-muted/40 p-6"
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

  return (
    <div className="h-[28rem] rounded-md overflow-hidden border isolate" dir="ltr">
      <MapContainer center={CENTRE_ALGERIE} zoom={5} preferCanvas scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON ref={couche} data={chargement.donnees} style={style} {...options} />
        <AjusterVue couche={couche} />
      </MapContainer>
    </div>
  );
};

export default CarteGeoJSON;
