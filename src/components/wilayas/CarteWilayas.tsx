import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useContoursWilayas, type ContourWilaya } from "@/hooks/use-wilayas";
import { cn } from "@/lib/utils";

const LARGEUR = 600;
/** Projection plane corrigée de la latitude moyenne de l'Algérie (les distances est-ouest restent justes). */
const COS_LATITUDE = Math.cos((28 * Math.PI) / 180);

type Anneau = number[][];

const codeDe = (contour: ContourWilaya) => String(contour.properties.code ?? contour.properties.wilaya_code ?? "").padStart(2, "0");
const polygonesDe = (contour: ContourWilaya): Anneau[][] =>
  contour.geometry.type === "Polygon" ? [contour.geometry.coordinates as Anneau[]] : (contour.geometry.coordinates as Anneau[][]);

/** Chemins SVG de chaque wilaya, calculés une fois pour toutes les cartes de la visite. */
function tracer(contours: ContourWilaya[]) {
  let ouest = Infinity;
  let est = -Infinity;
  let sud = Infinity;
  let nord = -Infinity;
  for (const contour of contours)
    for (const polygone of polygonesDe(contour))
      for (const [x, y] of polygone[0]) {
        ouest = Math.min(ouest, x);
        est = Math.max(est, x);
        sud = Math.min(sud, y);
        nord = Math.max(nord, y);
      }
  const echelle = LARGEUR / ((est - ouest) * COS_LATITUDE);
  const hauteur = (nord - sud) * echelle;
  const projeter = ([x, y]: number[]) => [(x - ouest) * COS_LATITUDE * echelle, (nord - y) * echelle];
  const point = (position: number[]) => projeter(position).map((v) => v.toFixed(1)).join(",");
  const chemins = contours.map((contour) => {
    const polygones = polygonesDe(contour);
    const sommets = polygones.flatMap((polygone) => polygone[0].map(projeter));
    const xs = sommets.map(([x]) => x);
    const ys = sommets.map(([, y]) => y);
    return {
      code: codeDe(contour),
      d: polygones.flatMap((polygone) => polygone.map((anneau) => `M${anneau.map(point).join("L")}Z`)).join(""),
      // Centre et taille de l'emprise : repère visible pour les petites wilayas (Alger, Blida…).
      centre: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2] as [number, number],
      taille: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)),
    };
  });
  return { chemins, hauteur };
}

interface CarteWilayasProps {
  /** Wilaya mise en avant (les autres restent grises). */
  surbrillance?: string;
  /** Lien de chaque wilaya : rend la carte cliquable. */
  lien?: (code: string) => string;
  /** Nom affiché au survol et lu par les lecteurs d'écran. */
  nom?: (code: string) => string;
  className?: string;
}

/** Carte des 69 wilayas en SVG (contours GeoAlgeria) : une wilaya en surbrillance, ou toutes cliquables. */
export const CarteWilayas = memo(({ surbrillance, lien, nom, className }: CarteWilayasProps) => {
  const { t } = useTranslation();
  const naviguer = useNavigate();
  const { data: contours, isError } = useContoursWilayas();
  const trace = useMemo(() => (contours ? tracer(contours) : null), [contours]);

  if (isError) return null;
  if (!trace) return <Skeleton className={cn("aspect-square w-full rounded-2xl", className)} />;

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${trace.hauteur.toFixed(0)}`}
      className={cn("h-auto w-full", className)}
      role={lien ? "group" : "img"}
      aria-label={t("wilayas.carteLibelle")}
    >
      {trace.chemins.map(({ code, d }) => {
        const active = code === surbrillance;
        const titre = nom?.(code) ?? code;
        const chemin = (
          <path
            d={d}
            className={cn(
              "stroke-white stroke-[1.2] transition-colors dark:stroke-gray-900",
              active ? "fill-emerald-600 dark:fill-emerald-500" : "fill-emerald-100 dark:fill-emerald-950",
              lien && "cursor-pointer hover:fill-emerald-400 dark:hover:fill-emerald-700"
            )}
          >
            <title>{titre}</title>
          </path>
        );
        if (!lien) return <g key={code}>{chemin}</g>;
        // Lien SVG : clic et clavier mènent à la page de la wilaya, sans recharger le site.
        return (
          <a
            key={code}
            href={lien(code)}
            aria-label={titre}
            className="focus:outline-none [&:focus-visible>path]:fill-emerald-500"
            onClick={(evenement) => {
              if (evenement.metaKey || evenement.ctrlKey || evenement.shiftKey) return;
              evenement.preventDefault();
              naviguer(lien(code));
            }}
          >
            {chemin}
          </a>
        );
      })}
      {/* La wilaya en surbrillance est redessinée par-dessus, pour que son contour ne soit pas caché. */}
      {surbrillance &&
        trace.chemins
          .filter((c) => c.code === surbrillance)
          .map((c) => (
            <g key="dessus" className="pointer-events-none">
              <path d={c.d} className="fill-none stroke-emerald-800 stroke-[1.5] dark:stroke-emerald-300" />
              {c.taille < 40 && (
                <>
                  <circle cx={c.centre[0]} cy={c.centre[1]} r={24} className="fill-emerald-500/20 stroke-emerald-600 stroke-[2.5] motion-safe:animate-pulse" />
                  <circle cx={c.centre[0]} cy={c.centre[1]} r={6} className="fill-emerald-700 dark:fill-emerald-300" />
                </>
              )}
            </g>
          ))}
    </svg>
  );
});
CarteWilayas.displayName = "CarteWilayas";
