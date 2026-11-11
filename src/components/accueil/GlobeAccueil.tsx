import { useEffect, useRef, useState } from "react";
import { geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useModeSombre } from "@/hooks/use-mode-sombre";

// Stations au sol (quelques grandes villes, décor : pas des données du catalogue), reliées aux satellites.
const stations: [number, number][] = [
  [3.06, 36.75], // Alger
  [-0.63, 35.7], // Oran
  [5.33, 31.95], // Ouargla
  [5.53, 22.79], // Tamanrasset
];

/** Orbites des satellites : rayon (× rayon du globe), inclinaison et nœud (radians), vitesse (tours par seconde). */
const orbites = [
  { rayon: 1.12, inclinaison: 1.05, noeud: 0.4, vitesse: 0.045, phase: 0 },
  { rayon: 1.16, inclinaison: -0.55, noeud: -0.9, vitesse: 0.032, phase: 2.1 },
  { rayon: 1.09, inclinaison: 0.25, noeud: 1.7, vitesse: 0.058, phase: 4.2 },
  { rayon: 1.14, inclinaison: 1.35, noeud: -2.4, vitesse: 0.038, phase: 5.6 },
];

/** Point d'une orbite en 3D (x à droite, y en haut, z vers l'observateur), rayon du globe = 1. */
function pointOrbite(orbite: (typeof orbites)[number], angle: number): [number, number, number] {
  const x0 = Math.cos(angle) * orbite.rayon;
  const y0 = Math.sin(angle) * orbite.rayon;
  // Inclinaison autour de l'axe x, puis rotation du nœud autour de l'axe y.
  const y1 = y0 * Math.cos(orbite.inclinaison);
  const z1 = y0 * Math.sin(orbite.inclinaison);
  return [x0 * Math.cos(orbite.noeud) + z1 * Math.sin(orbite.noeud), y1, -x0 * Math.sin(orbite.noeud) + z1 * Math.cos(orbite.noeud)];
}

/** Un point 3D est caché s'il est derrière le globe. */
const cache = ([x, y, z]: [number, number, number]) => z < 0 && x * x + y * y < 1;

const ID_ALGERIE = "012";
const CENTRE: [number, number] = [3, 28];

interface Monde {
  terres: FeatureCollection;
  algerie: Feature | undefined;
  /** Grille de points à l'intérieur de l'Algérie (« données »), calculée une fois. */
  points: [number, number][];
}

/** Fond de carte mondial (Natural Earth 1:110m), chargé à part pour ne pas alourdir le premier affichage. */
async function chargerMonde(): Promise<Monde> {
  const topologie = (await import("world-atlas/countries-110m.json")).default as unknown as Topology<{
    countries: GeometryCollection;
  }>;
  const terres = feature(topologie, topologie.objects.countries) as FeatureCollection;
  const algerie = terres.features.find((pays) => String(pays.id) === ID_ALGERIE);
  const points: [number, number][] = [];
  if (algerie) {
    for (let lat = 19.2; lat <= 37.2; lat += 1.1) {
      for (let lon = -8.6; lon <= 12; lon += 1.1) {
        // Une ligne sur deux décalée : grille en quinconce.
        const point: [number, number] = [lon + (Math.round(lat / 1.1) % 2 ? 0.55 : 0), lat];
        if (geoContains(algerie, point)) points.push(point);
      }
    }
  }
  return { terres, algerie, points };
}

const palettes = {
  clair: {
    oceanCentre: "#ecfdf5",
    oceanBord: "#a7f3d0",
    graticule: "rgba(4, 120, 87, 0.12)",
    terre: "#cbd5e1",
    algerie: "#059669",
    algerieClair: "#34d399",
    contourAlgerie: "#ecfdf5",
    pointAlgerie: "rgba(236, 253, 245, 0.85)",
    halo: "rgba(16, 185, 129, 0.35)",
    orbite: "rgba(4, 120, 87, 0.28)",
    satellite: "#0f172a",
    panneau: "#0ea5e9",
    faisceau: "16, 185, 129",
  },
  sombre: {
    oceanCentre: "#0b2e24",
    oceanBord: "#03140f",
    graticule: "rgba(110, 231, 183, 0.10)",
    terre: "#1f3b33",
    algerie: "#047857",
    algerieClair: "#34d399",
    contourAlgerie: "#a7f3d0",
    pointAlgerie: "rgba(209, 250, 229, 0.9)",
    halo: "rgba(16, 185, 129, 0.30)",
    orbite: "rgba(110, 231, 183, 0.22)",
    satellite: "#f8fafc",
    panneau: "#38bdf8",
    faisceau: "52, 211, 153",
  },
};

export const GlobeAccueil = () => {
  const { t } = useTranslation();
  const sombre = useModeSombre();
  const mouvementReduit = useReducedMotion();
  const canevas = useRef<HTMLCanvasElement>(null);
  const [monde, setMonde] = useState<Monde | null>(null);
  const glissement = useRef<{ depart: number; decalage: number } | null>(null);
  const decalageManuel = useRef(0);

  useEffect(() => {
    let actif = true;
    chargerMonde().then((resultat) => actif && setMonde(resultat));
    return () => {
      actif = false;
    };
  }, []);

  useEffect(() => {
    const element = canevas.current;
    const contexte = element?.getContext("2d");
    if (!element || !contexte || !monde) return;

    const couleurs = sombre ? palettes.sombre : palettes.clair;
    const projection = geoOrthographic().clipAngle(90).precision(0.5);
    const chemin = geoPath(projection, contexte);
    const graticule = geoGraticule10();
    let taille = 0;
    let densite = 1;

    const redimensionner = () => {
      densite = Math.min(window.devicePixelRatio || 1, 2);
      taille = element.clientWidth;
      element.width = taille * densite;
      element.height = taille * densite;
      contexte.setTransform(densite, 0, 0, densite, 0, 0);
      projection.translate([taille / 2, taille / 2]).scale(taille * 0.42);
    };
    redimensionner();
    window.addEventListener("resize", redimensionner);

    const dessiner = (temps: number) => {
      // Balancement doux autour de l'Algérie, plus la rotation faite à la souris.
      const balancement = mouvementReduit ? 0 : Math.sin(temps / 4000) * 40;
      projection.rotate([-CENTRE[0] + balancement + decalageManuel.current, -CENTRE[1] + 10]);

      const rayon = projection.scale();
      const centre = taille / 2;
      contexte.clearRect(0, 0, taille, taille);

      // Satellites : position de chacun et moitiés d'orbites (derrière le globe, puis devant).
      const temporel = mouvementReduit ? 0 : temps / 1000;
      const versEcran = ([x, y]: [number, number, number]): [number, number] => [centre + x * rayon, centre - y * rayon];
      const satellites = orbites.map((orbite) => {
        const angle = orbite.phase + temporel * orbite.vitesse * Math.PI * 2;
        const point = pointOrbite(orbite, angle);
        const suivant = versEcran(pointOrbite(orbite, angle + 0.05));
        const position = versEcran(point);
        return { position, devant: !cache(point), arriere: point[2] < 0, angle: Math.atan2(suivant[1] - position[1], suivant[0] - position[0]) };
      });
      const tracerOrbites = (devant: boolean) => {
        contexte.save();
        contexte.strokeStyle = couleurs.orbite;
        contexte.lineWidth = 1;
        contexte.setLineDash([2, 5]);
        orbites.forEach((orbite) => {
          contexte.beginPath();
          let enCours = false;
          for (let pas = 0; pas <= 120; pas += 1) {
            const point = pointOrbite(orbite, (pas / 120) * Math.PI * 2);
            const visible = devant ? point[2] >= 0 : point[2] < 0 && !cache(point);
            const [x, y] = versEcran(point);
            if (visible) {
              if (enCours) contexte.lineTo(x, y);
              else contexte.moveTo(x, y);
            }
            enCours = visible;
          }
          contexte.stroke();
        });
        contexte.restore();
      };
      const dessinerSatellite = (x: number, y: number, angle: number, attenue = false) => {
        contexte.save();
        contexte.translate(x, y);
        contexte.rotate(angle);
        contexte.scale(1.5, 1.5);
        contexte.globalAlpha = attenue ? 0.35 : 1;
        contexte.fillStyle = couleurs.panneau;
        contexte.fillRect(-9, -2, 5.5, 4);
        contexte.fillRect(3.5, -2, 5.5, 4);
        contexte.fillStyle = couleurs.satellite;
        contexte.fillRect(-3, -3, 6, 6);
        contexte.fillRect(-0.5, -6, 1, 3);
        contexte.restore();
      };

      // Atmosphère autour du globe.
      const halo = contexte.createRadialGradient(centre, centre, rayon * 0.95, centre, centre, rayon * 1.18);
      halo.addColorStop(0, couleurs.halo);
      halo.addColorStop(1, "rgba(16, 185, 129, 0)");
      contexte.fillStyle = halo;
      contexte.beginPath();
      contexte.arc(centre, centre, rayon * 1.18, 0, Math.PI * 2);
      contexte.fill();

      tracerOrbites(false);
      satellites.forEach(({ position, arriere, devant, angle }) => {
        if (arriere && devant) dessinerSatellite(position[0], position[1], angle, true);
      });

      // Océan avec un dégradé qui donne du volume.
      const ocean = contexte.createRadialGradient(centre - rayon * 0.35, centre - rayon * 0.35, rayon * 0.1, centre, centre, rayon);
      ocean.addColorStop(0, couleurs.oceanCentre);
      ocean.addColorStop(1, couleurs.oceanBord);
      contexte.beginPath();
      chemin({ type: "Sphere" } as GeoPermissibleObjects);
      contexte.fillStyle = ocean;
      contexte.fill();

      contexte.beginPath();
      chemin(graticule);
      contexte.strokeStyle = couleurs.graticule;
      contexte.lineWidth = 0.6;
      contexte.stroke();

      contexte.beginPath();
      chemin(monde.terres);
      contexte.fillStyle = couleurs.terre;
      contexte.fill();

      // Centre de la face visible : un point plus loin que 90° est de l'autre côté du globe.
      const vue: [number, number] = [-projection.rotate()[0], -projection.rotate()[1]];

      if (monde.algerie) {
        // Algérie : dégradé émeraude lumineux, halo, grille de points qui scintillent, contour clair qui défile.
        const [[x0, y0], [x1, y1]] = chemin.bounds(monde.algerie);
        const degrade = contexte.createLinearGradient(x0, y0, x1, y1);
        degrade.addColorStop(0, couleurs.algerieClair);
        degrade.addColorStop(1, couleurs.algerie);
        contexte.save();
        contexte.shadowColor = couleurs.algerieClair;
        contexte.shadowBlur = 24;
        contexte.beginPath();
        chemin(monde.algerie);
        contexte.fillStyle = degrade;
        contexte.fill();
        contexte.restore();

        monde.points.forEach((point, indice) => {
          if (geoDistance(point, vue) > Math.PI / 2) return;
          const position = projection(point);
          if (!position) return;
          const eclat = mouvementReduit ? 0.6 : 0.35 + 0.65 * Math.max(0, Math.sin(temps / 700 + indice * 1.7));
          contexte.globalAlpha = eclat;
          contexte.beginPath();
          contexte.arc(position[0], position[1], 1.1, 0, Math.PI * 2);
          contexte.fillStyle = couleurs.pointAlgerie;
          contexte.fill();
        });
        contexte.globalAlpha = 1;

        contexte.save();
        contexte.beginPath();
        chemin(monde.algerie);
        contexte.strokeStyle = couleurs.contourAlgerie;
        contexte.lineWidth = 1.4;
        contexte.setLineDash([6, 4]);
        contexte.lineDashOffset = mouvementReduit ? 0 : -temps / 60;
        contexte.stroke();
        contexte.restore();
      }

      tracerOrbites(true);

      // Stations au sol : point blanc cerclé d'émeraude, avec une onde qui s'élargit.
      const stationsVisibles: [number, number][] = [];
      stations.forEach((station, indice) => {
        if (geoDistance(station, vue) > Math.PI / 2 - 0.05) return;
        const position = projection(station);
        if (!position) return;
        stationsVisibles.push(position as [number, number]);
        const onde = mouvementReduit ? 0.5 : ((temps / 1600 + indice / stations.length) % 1);
        contexte.beginPath();
        contexte.arc(position[0], position[1], 3 + onde * 9, 0, Math.PI * 2);
        contexte.strokeStyle = `rgba(${couleurs.faisceau}, ${0.6 * (1 - onde)})`;
        contexte.lineWidth = 1.2;
        contexte.stroke();
        contexte.beginPath();
        contexte.arc(position[0], position[1], 2.6, 0, Math.PI * 2);
        contexte.fillStyle = "#ffffff";
        contexte.fill();
        contexte.lineWidth = 1.4;
        contexte.strokeStyle = couleurs.algerie;
        contexte.stroke();
      });

      // Satellites devant le globe, reliés à la station visible la plus proche par un faisceau animé.
      satellites.forEach(({ position, arriere, angle }, indice) => {
        if (arriere) return;
        const [sx, sy] = position;
        const proche = stationsVisibles
          .map((station) => ({ station, distance: Math.hypot(station[0] - sx, station[1] - sy) }))
          .sort((a, b) => a.distance - b.distance)[0];
        if (proche && proche.distance < rayon * 1.3) {
          const [tx, ty] = proche.station;
          const faisceau = contexte.createLinearGradient(sx, sy, tx, ty);
          faisceau.addColorStop(0, `rgba(${couleurs.faisceau}, 0.9)`);
          faisceau.addColorStop(1, `rgba(${couleurs.faisceau}, 0.15)`);
          contexte.save();
          contexte.beginPath();
          contexte.moveTo(sx, sy);
          contexte.lineTo(tx, ty);
          contexte.strokeStyle = faisceau;
          contexte.lineWidth = 1;
          contexte.setLineDash([3, 4]);
          contexte.lineDashOffset = mouvementReduit ? 0 : temps / 40;
          contexte.stroke();
          contexte.restore();
          // Paquet de données qui descend le long du faisceau.
          const avance = mouvementReduit ? 0.5 : ((temps / 1400 + indice * 0.33) % 1);
          contexte.beginPath();
          contexte.arc(sx + (tx - sx) * avance, sy + (ty - sy) * avance, 1.8, 0, Math.PI * 2);
          contexte.fillStyle = `rgba(${couleurs.faisceau}, 1)`;
          contexte.fill();
        }
        dessinerSatellite(sx, sy, angle);
      });
    };

    let image = 0;
    let visible = true;
    const boucle = (temps: number) => {
      if (visible) dessiner(temps);
      image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);

    // Inutile d'animer le globe quand il est hors de l'écran.
    const observateur = new IntersectionObserver(([entree]) => {
      visible = entree.isIntersecting;
    });
    observateur.observe(element);
    element.style.opacity = "1";

    return () => {
      cancelAnimationFrame(image);
      observateur.disconnect();
      window.removeEventListener("resize", redimensionner);
    };
  }, [monde, sombre, mouvementReduit]);

  const commencer = (x: number) => {
    glissement.current = { depart: x, decalage: decalageManuel.current };
  };
  const deplacer = (x: number) => {
    if (!glissement.current) return;
    decalageManuel.current = glissement.current.decalage + (x - glissement.current.depart) / 3;
  };
  const terminer = () => {
    glissement.current = null;
  };

  return (
    <div className="relative aspect-square w-full max-w-[560px] mx-auto">
      <div className="absolute inset-[15%] rounded-full bg-emerald-400/25 dark:bg-emerald-500/15 blur-3xl animate-halo" aria-hidden />
      <canvas
        ref={canevas}
        role="img"
        aria-label={t("accueil.globe")}
        className="relative h-full w-full cursor-grab active:cursor-grabbing touch-pan-y opacity-0 transition-opacity duration-1000"
        onPointerDown={(event) => commencer(event.clientX)}
        onPointerMove={(event) => deplacer(event.clientX)}
        onPointerUp={terminer}
        onPointerLeave={terminer}
      />
    </div>
  );
};
