import { apparenceCategorie } from "@/lib/apparence";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { cn } from "@/lib/utils";
import type { TexteMultilingue } from "@/lib/types";

interface BadgeCategorieProps {
  nom: TexteMultilingue;
  icone: string | null | undefined;
  taille?: "sm" | "md";
  className?: string;
}

export const BadgeCategorie = ({ nom, icone, taille = "sm", className }: BadgeCategorieProps) => {
  const langue = useLangue();
  const { icone: Icone, couleurs } = apparenceCategorie(icone);

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full font-semibold",
        taille === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        couleurs,
        className
      )}
    >
      <Icone className={taille === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      {texteTraduit(nom, langue)}
    </span>
  );
};

/** Icône seule, dans la couleur de la catégorie (menus, listes). */
export const IconeCategorie = ({ icone }: { icone: string | null | undefined }) => {
  const { icone: Icone, couleurs } = apparenceCategorie(icone);
  return (
    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", couleurs)} aria-hidden>
      <Icone className="h-3.5 w-3.5" />
    </span>
  );
};
