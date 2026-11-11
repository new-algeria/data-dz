import { useEffect, useRef, useState } from "react";
import {
  geoContains,
  geoDistance,
  geoGraticule10,
  geoInterpolate,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useModeSombre } from "@/hooks/use-mode-sombre";

type Point = [number, number];

// Quelques grandes villes (décor, pas des données du catalogue) : les nœuds du réseau algérien.
const VILLES = {
  alger: [3.06, 36.75],
  oran: [-0.63, 35.7],
  constantine: [6.61, 36.36],
  annaba: [7.77, 36.9],
  ghardaia: [3.67, 32.49],
  ouargla: [5.33, 31.95],
  bechar: [-2.22, 31.62],
  adrar: [-0.29, 27.87],
  illizi: [8.47, 26.48],
  tamanrasset: [5.53, 22.79],
} satisfies Record<string, Point>;

type Ville = keyof typeof VILLES;

/** Liaisons du réseau entre villes : tout le pays relié par ses données. */
const RESEAU: [Ville, Ville][] = [
  ["alger", "oran"],
  ["alger", "constantine"],
  ["constantine", "annaba"],
  ["alger", "ghardaia"],
  ["ghardaia", "ouargla"],
  ["oran", "bechar"],
  ["bechar", "adrar"],
  ["ghardaia", "adrar"],
  ["adrar", "tamanrasset"],
  ["ouargla", "illizi"],
  ["illizi", "tamanrasset"],
  ["constantine", "ouargla"],
];

/**
 * Arcs vers le reste du monde : la lumière part toujours de l'Algérie (données partagées, accessibles de partout).
 * Destinations sans nom, de simples directions.
 */
const ARCS_SORTANTS: { depart: Ville; arrivee: Point }[] = [
  { depart: "alger", arrivee: [10, 51] },
  { depart: "oran", arrivee: [-40, 18] },
  { depart: "tamanrasset", arrivee: [-12, 9] },
  { depart: "constantine", arrivee: [36, 31] },
  { depart: "tamanrasset", arrivee: [24, -8] },
  { depart: "alger", arrivee: [-60, 42] },
];

const ID_ALGERIE = "012";
const CENTRE: Point = [3, 28];

interface Monde {
  terres: FeatureCollection;
  algerie: Feature | undefined;
  /** Grille de points à l'intérieur de l'Algérie (« données »), calculée une fois. */
  points: Point[];
}

/** Fond de carte mondial (Natural Earth 1:110m), chargé à part pour ne pas alourdir le premier affichage. */
async function chargerMonde(): Promise<Monde> {
  const topologie = (await import("world-atlas/countries-110m.json")).default as unknown as Topology<{
    countries: GeometryCollection;
  }>;
  const terres = feature(topologie, topologie.objects.countries) as FeatureCollection;
  const algerie = terres.features.find((pays) => String(pays.id) === ID_ALGERIE);
  const points: Point[] = [];
  if (algerie) {
    for (let lat = 19.2; lat <= 37.2; lat += 1.1) {
      for (let lon = -8.6; lon <= 12; lon += 1.1) {
        // Une ligne sur deux décalée : grille en quinconce.
        const point: Point = [lon + (Math.round(lat / 1.1) % 2 ? 0.55 : 0), lat];
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
    // Réseau intérieur (sur le vert de l'Algérie) et arcs sortants (sur le gris des terres et l'océan).
    reseau: "236, 253, 245",
    lumiere: "5, 150, 105",
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
    reseau: "209, 250, 229",
    lumiere: "52, 211, 153",
  },
};

/** Un arc précalculé : interpolation sur la sphère et hauteur au-dessus du sol (en part du rayon). */
interface Arc {
  interpoler: (t: number) => Point;
  hauteur: number;
  /** Décalage de l'animation, pour que les lumières ne partent pas toutes ensemble. */
  phase: number;
}

// Une liaison sur deux est parcourue dans l'autre sens : les lumières circulent dans les deux sens.
const arcsReseau: Arc[] = RESEAU.map(([a, b], indice) => ({
  interpoler: (indice % 2 ? geoInterpolate(VILLES[b], VILLES[a]) : geoInterpolate(VILLES[a], VILLES[b])) as (t: number) => Point,
  hauteur: 0.025,
  phase: (indice * 0.37) % 1,
}));

const arcsSortants: Arc[] = ARCS_SORTANTS.map(({ depart, arrivee }, indice) => ({
  interpoler: geoInterpolate(VILLES[depart], arrivee) as (t: number) => Point,
  hauteur: 0.16,
  phase: indice / ARCS_SORTANTS.length,
}));

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
      // Centre de la face visible : un point plus loin que 90° est de l'autre côté du globe.
      const vue: Point = [-projection.rotate()[0], -projection.rotate()[1]];
      contexte.clearRect(0, 0, taille, taille);

      /** Position à l'écran d'un point d'arc, soulevé au-dessus du sol ; `null` s'il est caché derrière le globe. */
      const pointArc = (arc: Arc, avance: number): Point | null => {
        const point = arc.interpoler(avance);
        if (geoDistance(point, vue) > Math.PI / 2) return null;
        const position = projection(point);
        if (!position) return null;
        const elevation = 1 + arc.hauteur * Math.sin(Math.PI * avance);
        return [centre + (position[0] - centre) * elevation, centre + (position[1] - centre) * elevation];
      };

      /** Trace la portion [de, a] d'un arc (coupée là où il passe derrière le globe). */
      const tracerArc = (arc: Arc, de: number, a: number) => {
        contexte.beginPath();
        let enCours = false;
        const pas = Math.max((a - de) / 24, 0.004);
        for (let avance = de; avance <= a + 1e-6; avance += pas) {
          const position = pointArc(arc, Math.min(avance, a));
          if (position) {
            if (enCours) contexte.lineTo(position[0], position[1]);
            else contexte.moveTo(position[0], position[1]);
          }
          enCours = position !== null;
        }
        contexte.stroke();
      };

      /** Lumière qui file le long d'un arc : traînée dégradée et tête brillante. */
      const lumiere = (arc: Arc, tete: number, longueur: number, rgb: string, epaisseur: number, opacite = 1) => {
        const queue = Math.max(0, tete - longueur);
        const debut = pointArc(arc, queue);
        const fin = pointArc(arc, tete);
        if (!debut || !fin) return;
        const degrade = contexte.createLinearGradient(debut[0], debut[1], fin[0], fin[1]);
        degrade.addColorStop(0, `rgba(${rgb}, 0)`);
        degrade.addColorStop(1, `rgba(${rgb}, ${opacite})`);
        contexte.strokeStyle = degrade;
        contexte.lineWidth = epaisseur;
        contexte.lineCap = "round";
        tracerArc(arc, queue, tete);
        contexte.beginPath();
        contexte.arc(fin[0], fin[1], epaisseur * 0.9, 0, Math.PI * 2);
        contexte.fillStyle = `rgba(${rgb}, ${opacite})`;
        contexte.fill();
      };

      // Atmosphère autour du globe.
      const halo = contexte.createRadialGradient(centre, centre, rayon * 0.95, centre, centre, rayon * 1.18);
      halo.addColorStop(0, couleurs.halo);
      halo.addColorStop(1, "rgba(16, 185, 129, 0)");
      contexte.fillStyle = halo;
      contexte.beginPath();
      contexte.arc(centre, centre, rayon * 1.18, 0, Math.PI * 2);
      contexte.fill();

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

      contexte.save();

      // Arcs sortants : trace fine, puis une lumière qui part de l'Algérie et une onde à l'arrivée.
      arcsSortants.forEach((arc) => {
        contexte.strokeStyle = `rgba(${couleurs.lumiere}, 0.22)`;
        contexte.lineWidth = 1;
        contexte.setLineDash([2, 4]);
        tracerArc(arc, 0, 1);
        contexte.setLineDash([]);
        if (mouvementReduit) return;
        // Cycle : le trajet occupe 60 % du temps, puis une pause avant le suivant.
        const cycle = (temps / 5200 + arc.phase) % 1;
        const tete = Math.min(cycle / 0.6, 1);
        if (cycle < 0.6) lumiere(arc, tete, 0.22, couleurs.lumiere, 2);
        else {
          const onde = (cycle - 0.6) / 0.4;
          const arrivee = pointArc(arc, 1);
          if (arrivee) {
            contexte.beginPath();
            contexte.arc(arrivee[0], arrivee[1], 2 + onde * 10, 0, Math.PI * 2);
            contexte.strokeStyle = `rgba(${couleurs.lumiere}, ${0.55 * (1 - onde)})`;
            contexte.lineWidth = 1.2;
            contexte.stroke();
          }
        }
      });

      // Réseau entre villes : liaisons fines et lumières qui circulent dans les deux sens.
      arcsReseau.forEach((arc) => {
        contexte.strokeStyle = `rgba(${couleurs.reseau}, 0.45)`;
        contexte.lineWidth = 0.9;
        tracerArc(arc, 0, 1);
        if (mouvementReduit) return;
        const avance = (temps / 2600 + arc.phase) % 1;
        lumiere(arc, avance, 0.25, couleurs.reseau, 1.6, 0.95);
      });

      contexte.restore();

      // Villes : petit point blanc cerclé de vert (nœud du réseau).
      Object.values(VILLES).forEach((ville) => {
        if (geoDistance(ville, vue) > Math.PI / 2) return;
        const position = projection(ville);
        if (!position) return;
        contexte.beginPath();
        contexte.arc(position[0], position[1], 2.4, 0, Math.PI * 2);
        contexte.fillStyle = "#ffffff";
        contexte.fill();
        contexte.lineWidth = 1.2;
        contexte.strokeStyle = couleurs.algerie;
        contexte.stroke();
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
