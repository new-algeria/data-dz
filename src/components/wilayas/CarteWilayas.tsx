import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useContoursWilayas } from "@/hooks/use-wilayas";
import { LARGEUR_CARTE, tracerWilayas } from "@/lib/trace-wilayas";
import { cn } from "@/lib/utils";

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
  const trace = useMemo(() => (contours ? tracerWilayas(contours) : null), [contours]);

  if (isError) return null;
  if (!trace) return <Skeleton className={cn("aspect-square w-full rounded-2xl", className)} />;

  return (
    <svg
      viewBox={`0 0 ${LARGEUR_CARTE} ${trace.hauteur.toFixed(0)}`}
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
