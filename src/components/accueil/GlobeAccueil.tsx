import { useEffect, useRef, useState } from "react";
import { geoGraticule10, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useModeSombre } from "@/hooks/use-mode-sombre";

// Quelques chefs-lieux de wilaya, pour situer le pays sur le globe (décor, pas des données du catalogue).
const villes: [number, number][] = [
  [3.06, 36.75], // Alger
  [-0.63, 35.7], // Oran
  [6.61, 36.36], // Constantine
  [7.77, 36.9], // Annaba
  [-1.32, 34.88], // Tlemcen
  [3.67, 32.49], // Ghardaïa
  [5.33, 31.95], // Ouargla
  [-2.22, 31.62], // Béchar
  [-0.29, 27.87], // Adrar
  [8.47, 26.48], // Illizi
  [5.53, 22.79], // Tamanrasset
];

const ID_ALGERIE = "012";
const CENTRE: [number, number] = [3, 28];

interface Monde {
  terres: FeatureCollection;
  algerie: Feature | undefined;
}

/** Fond de carte mondial (Natural Earth 1:110m), chargé à part pour ne pas alourdir le premier affichage. */
async function chargerMonde(): Promise<Monde> {
  const topologie = (await import("world-atlas/countries-110m.json")).default as unknown as Topology<{
    countries: GeometryCollection;
  }>;
  const terres = feature(topologie, topologie.objects.countries) as FeatureCollection;
  return { terres, algerie: terres.features.find((pays) => String(pays.id) === ID_ALGERIE) };
}

const palettes = {
  clair: {
    oceanCentre: "#ecfdf5",
    oceanBord: "#a7f3d0",
    graticule: "rgba(4, 120, 87, 0.12)",
    terre: "#cbd5e1",
    algerie: "#059669",
    contourAlgerie: "#065f46",
    halo: "rgba(16, 185, 129, 0.35)",
  },
  sombre: {
    oceanCentre: "#0b2e24",
    oceanBord: "#03140f",
    graticule: "rgba(110, 231, 183, 0.10)",
    terre: "#1f3b33",
    algerie: "#10b981",
    contourAlgerie: "#6ee7b7",
    halo: "rgba(16, 185, 129, 0.30)",
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
        contexte.save();
        contexte.shadowColor = couleurs.algerie;
        contexte.shadowBlur = 18;
        contexte.beginPath();
        chemin(monde.algerie);
        contexte.fillStyle = couleurs.algerie;
        contexte.fill();
        contexte.restore();
        contexte.beginPath();
        chemin(monde.algerie);
        contexte.strokeStyle = couleurs.contourAlgerie;
        contexte.lineWidth = 1;
        contexte.stroke();
      }

      // Villes : points rouges qui pulsent légèrement.
      const pulsation = mouvementReduit ? 0 : (Math.sin(temps / 500) + 1) / 2;
      villes.forEach((ville, indice) => {
        const position = projection(ville);
        if (!position) return;
        const [x, y] = position;
        const decalage = (pulsation + indice / villes.length) % 1;
        contexte.beginPath();
        contexte.arc(x, y, 2 + decalage * 5, 0, Math.PI * 2);
        contexte.fillStyle = `rgba(220, 38, 38, ${0.35 * (1 - decalage)})`;
        contexte.fill();
        contexte.beginPath();
        contexte.arc(x, y, 2.2, 0, Math.PI * 2);
        contexte.fillStyle = "#dc2626";
        contexte.fill();
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
