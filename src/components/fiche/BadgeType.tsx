import { useTranslation } from "react-i18next";
import { apparenceGenre, genreDuType } from "@/lib/apparence";
import { cn } from "@/lib/utils";

/** Type d'une colonne en clair (« Texte », « Nombre entier »…), avec le type d'origine en petit. */
export const BadgeType = ({ type, compact = false }: { type: string | undefined; compact?: boolean }) => {
  const { t } = useTranslation();
  if (!type) return null;

  const genre = genreDuType(type);
  const { icone: Icone, couleurs } = apparenceGenre(genre);
  const libelle = genre ? t(`types.${genre}`) : type;

  return (
    <span className="inline-flex items-center gap-2" title={t("types.origine", { type })}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium",
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
          couleurs
        )}
      >
        <Icone className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
        {libelle}
      </span>
      {!compact && genre && (
        <code className="font-mono text-[11px] text-muted-foreground" dir="ltr">
          {type}
        </code>
      )}
    </span>
  );
};
