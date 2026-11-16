import { memo, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useContoursWilayas } from "@/hooks/use-wilayas";
import { LARGEUR_CARTE, tracerWilayas } from "@/lib/trace-wilayas";
import { cn } from "@/lib/utils";
import { TEINTE_VIDE, TEINTES_CLASSES } from "./teintes";

interface CarteChoroplethePropos {
  /** Classe de teinte de chaque wilaya (-1 = aucune donnée). */
  classes: Record<string, number>;
  choisie: string | null;
  onChoisir: (code: string) => void;
  /** Texte de la bulle au survol (nom et valeur). */
  bulle: (code: string) => { titre: string; detail: string };
  className?: string;
}

/**
 * Grande carte des 69 wilayas colorée selon une mesure : survol (bulle), clic ou clavier (Entrée) pour choisir une wilaya,
 * contour et repère sur la wilaya choisie (repère visible même pour les petites comme Alger).
 */
export const CarteChoroplethe = memo(({ classes, choisie, onChoisir, bulle, className }: CarteChoroplethePropos) => {
  const { t } = useTranslation();
  const { data: contours, isError } = useContoursWilayas();
  const trace = useMemo(() => (contours ? tracerWilayas(contours) : null), [contours]);
  const cadre = useRef<HTMLDivElement>(null);
  const [survol, setSurvol] = useState<{ code: string; x: number; y: number } | null>(null);

  if (isError) return null;
  if (!trace) return <Skeleton className={cn("aspect-square w-full rounded-xl", className)} />;

  const position = (evenement: { clientX: number; clientY: number }, code: string) => {
    const boite = cadre.current?.getBoundingClientRect();
    if (!boite) return;
    setSurvol({ code, x: evenement.clientX - boite.left, y: evenement.clientY - boite.top });
  };
  const choisieTrace = choisie ? trace.chemins.find((chemin) => chemin.code === choisie) : null;
  const infos = survol ? bulle(survol.code) : null;

  return (
    <div ref={cadre} className={cn("relative", className)}>
      <svg viewBox={`0 0 ${LARGEUR_CARTE} ${trace.hauteur.toFixed(0)}`} className="h-auto max-h-[72vh] w-full" role="group" aria-label={t("wilayas.carteLibelle")}>
        {trace.chemins.map(({ code, d }) => {
          const classe = classes[code] ?? -1;
          return (
            <path
              key={code}
              d={d}
              tabIndex={0}
              role="button"
              aria-label={bulle(code).titre}
              aria-pressed={code === choisie}
              onClick={() => onChoisir(code)}
              onKeyDown={(evenement) => {
                if (evenement.key === "Enter" || evenement.key === " ") {
                  evenement.preventDefault();
                  onChoisir(code);
                }
              }}
              onPointerMove={(evenement) => position(evenement, code)}
              onPointerLeave={() => setSurvol(null)}
              onBlur={() => setSurvol(null)}
              className={cn(
                "cursor-pointer stroke-white stroke-[0.9] outline-none transition-[fill,opacity] duration-300 hover:opacity-80 focus-visible:stroke-gray-900 focus-visible:stroke-2 motion-reduce:transition-none dark:stroke-gray-900 dark:focus-visible:stroke-white",
                classe < 0 ? TEINTE_VIDE : TEINTES_CLASSES[classe]
              )}
            />
          );
        })}
        {choisieTrace && (
          <g className="pointer-events-none">
            <path d={choisieTrace.d} className="fill-none stroke-gray-900 stroke-2 dark:stroke-white" />
            {choisieTrace.taille < 22 && <circle cx={choisieTrace.centre[0]} cy={choisieTrace.centre[1]} r={20} className="fill-none stroke-gray-900 stroke-2 dark:stroke-white" />}
          </g>
        )}
      </svg>
      {survol && infos && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-white dark:text-gray-900"
          style={{ left: Math.min(Math.max(survol.x, 90), (cadre.current?.clientWidth ?? 0) - 90), top: Math.max(survol.y, 48) }}
        >
          <span className="block text-sm font-semibold">{infos.titre}</span>
          {infos.detail}
        </div>
      )}
    </div>
  );
});
CarteChoroplethe.displayName = "CarteChoroplethe";
