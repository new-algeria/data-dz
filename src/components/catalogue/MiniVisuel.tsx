import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Miniature } from "@/lib/detecterVisuel";
import { calculerMiniature, cleMiniature, miniatureEnCache } from "@/lib/miniature";
import type { ResumeDonnee } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Sparkline : aire et ligne sur toute la largeur (le temps se lit de droite à gauche en arabe). */
const Sparkline = ({ valeurs }: { valeurs: number[] }) => {
  const degrade = useId();
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const ecart = max - min || 1;
  const points = valeurs.map((valeur, indice) => [(indice / (valeurs.length - 1)) * 100, 52 - ((valeur - min) / ecart) * 44] as const);
  const ligne = points.map(([x, y], indice) => `${indice ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full rtl:-scale-x-100" aria-hidden>
      <defs>
        <linearGradient id={degrade} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${ligne} L100,60 L0,60 Z`} fill={`url(#${degrade})`} />
      <path d={ligne} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
};

/** Points dans le cadre de l'Algérie. */
const NuagePoints = ({ points }: { points: [number, number][] }) => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
    {points.map(([x, y], indice) => (
      <circle key={indice} cx={x * 100} cy={y * 100} r="1.1" fill="currentColor" fillOpacity="0.75" />
    ))}
  </svg>
);

interface MiniVisuelProps {
  donnee: Pick<ResumeDonnee, "slug" | "mis_a_jour_le" | "versions">;
  /** Affiché tant que la miniature n'est pas prête, ou si la donnée n'a rien de traçable. */
  repli: ReactNode;
  className?: string;
  /** Classes de la miniature seule (opacité, fondu), l'illustration de repli gardant les siennes. */
  classeMiniature?: string;
}

/**
 * Miniature d'une carte du catalogue : sparkline (graphique) ou nuage de points (carte), sinon l'illustration.
 * Le calcul (fiche + fichier de 5 Mo maximum) ne part que lorsque la carte devient visible à l'écran.
 */
export const MiniVisuel = ({ donnee, repli, className, classeMiniature }: MiniVisuelProps) => {
  const reference = useRef<HTMLDivElement>(null);
  const cle = cleMiniature(donnee);
  const enCache = miniatureEnCache(cle);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = reference.current;
    if (!element || enCache !== undefined) return;
    if (typeof IntersectionObserver === "undefined") return setVisible(true);
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((entree) => entree.isIntersecting)) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [enCache]);

  const { data: miniature } = useQuery<Miniature | null>({
    queryKey: ["miniature", cle],
    queryFn: ({ signal }) => calculerMiniature(donnee, signal),
    enabled: visible && enCache === undefined,
    initialData: enCache,
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div ref={reference} className={cn("pointer-events-none", className)} aria-hidden>
      {miniature?.genre === "courbe" ? (
        <div className={cn("h-full w-full p-3 text-emerald-600 dark:text-emerald-400", classeMiniature)}>
          <Sparkline valeurs={miniature.valeurs} />
        </div>
      ) : miniature?.genre === "points" ? (
        <div className={cn("h-full w-full p-2 text-emerald-600 dark:text-emerald-400", classeMiniature)}>
          <NuagePoints points={miniature.points} />
        </div>
      ) : (
        repli
      )}
    </div>
  );
};
