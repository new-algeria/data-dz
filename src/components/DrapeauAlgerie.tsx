import { useId } from "react";
import { cn } from "@/lib/utils";

// Drapeau de l'Algérie (proportions 3:2, vert #006233, blanc, rouge #D21034).
// Construction : croissant = disque de rayon h/4 au centre, moins un disque de rayon h/5 décalé de h/16 vers le battant ;
// étoile à cinq branches de rayon h/8, dont une pointe vise la hampe.
const LARGEUR = 900;
const HAUTEUR = 600;
const CENTRE_X = LARGEUR / 2;
const CENTRE_Y = HAUTEUR / 2;
const CENTRE_ETOILE_X = 490;
const RAYON_ETOILE = HAUTEUR / 8;

const pointsEtoile = Array.from({ length: 10 }, (_, i) => {
  const rayon = i % 2 === 0 ? RAYON_ETOILE : RAYON_ETOILE * 0.382;
  const angle = Math.PI + (i * Math.PI) / 5;
  return `${(CENTRE_ETOILE_X + rayon * Math.cos(angle)).toFixed(1)},${(CENTRE_Y + rayon * Math.sin(angle)).toFixed(1)}`;
}).join(" ");

interface DrapeauAlgerieProps {
  className?: string;
  /** Texte alternatif ; sans lui, le drapeau est décoratif (masqué aux lecteurs d'écran). */
  titre?: string;
}

export const DrapeauAlgerie = ({ className, titre }: DrapeauAlgerieProps) => {
  const idMasque = `croissant-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      className={cn("inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10", className)}
      role={titre ? "img" : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : true}
    >
      <defs>
        <mask id={idMasque}>
          <rect width={LARGEUR} height={HAUTEUR} fill="#fff" />
          <circle cx={CENTRE_X + HAUTEUR / 16} cy={CENTRE_Y} r={HAUTEUR / 5} fill="#000" />
        </mask>
      </defs>
      <rect width={LARGEUR} height={HAUTEUR} fill="#fff" />
      <rect width={LARGEUR / 2} height={HAUTEUR} fill="#006233" />
      <circle cx={CENTRE_X} cy={CENTRE_Y} r={HAUTEUR / 4} fill="#D21034" mask={`url(#${idMasque})`} />
      <polygon points={pointsEtoile} fill="#D21034" />
    </svg>
  );
};
