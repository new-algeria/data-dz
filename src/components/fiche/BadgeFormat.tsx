import { apparenceFormat } from "@/lib/apparence";
import { cn } from "@/lib/utils";

/** Pastille d'icône colorée pour un format de fichier (JSON en jaune, GeoJSON en vert…). */
export const IconeFormat = ({ format, className }: { format: string; className?: string }) => {
  const { icone: Icone, couleurs } = apparenceFormat(format);
  return (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", couleurs, className)} aria-hidden>
      <Icone className="h-5 w-5" />
    </span>
  );
};

export const BadgeFormat = ({ format }: { format: string }) => {
  const { couleurs } = apparenceFormat(format);
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide", couleurs)}>
      {format}
    </span>
  );
};
