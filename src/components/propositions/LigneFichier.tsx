import type { ReactNode } from "react";
import { BadgeFormat, IconeFormat } from "@/components/fiche/BadgeFormat";
import { formaterTaille } from "@/lib/fichiers";
import { extensionFichier } from "@/lib/soumissions";
import { useLangue } from "@/hooks/use-langue";

interface LigneFichierProps {
  nom: string;
  taille: number | null;
  /** Ligne d'état sous le nom (erreur, envoi en cours…). */
  etat?: ReactNode;
  actions?: ReactNode;
  /** « div » quand la ligne n'est pas directement dans une liste. */
  element?: "li" | "div";
}

export const LigneFichier = ({ nom, taille, etat, actions, element: Element = "li" }: LigneFichierProps) => {
  const langue = useLangue();
  const format = extensionFichier(nom);
  return (
    <Element className="flex flex-wrap items-center gap-3 p-3">
      <IconeFormat format={format} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" dir="ltr">
          {nom}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <BadgeFormat format={format} />
          {taille !== null && <span>{formaterTaille(taille, langue)}</span>}
        </p>
        {etat && <div className="mt-1 text-xs">{etat}</div>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </Element>
  );
};
