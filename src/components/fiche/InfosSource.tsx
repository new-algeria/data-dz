import { useTranslation } from "react-i18next";
import { useLangue } from "@/hooks/use-langue";
import { localeNombres } from "@/lib/fichiers";
import { ANNEES, CLES_AFFICHEES, POURCENTAGES } from "@/lib/couverture";
import { valeurEnTexte } from "@/lib/valeurs";

/** Couverture de la source : libellés traduits à la place des clés techniques, valeurs mises en forme. */
export const InfosSource = ({ infos }: { infos: Record<string, unknown> }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const locale = localeNombres(langue);

  const formater = (cle: string, valeur: unknown): string => {
    if (typeof valeur === "number" && !ANNEES.has(cle)) {
      const texte = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(valeur);
      return POURCENTAGES.has(cle) ? `${texte} %` : texte;
    }
    if (typeof valeur === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
      return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(valeur));
    }
    return valeurEnTexte(valeur, 300);
  };

  const entrees = CLES_AFFICHEES.filter((cle) => infos[cle] !== null && infos[cle] !== undefined && infos[cle] !== "");
  if (entrees.length === 0) return null;

  return (
    <dl className="space-y-2 text-sm">
      {entrees.map((cle) =>
        cle === "note_couverture" ? (
          <div key={cle} className="border-t border-dashed border-gray-200 pt-2 dark:border-white/10">
            <dt className="mb-1 text-muted-foreground">{t(`fiche.couvertureCles.${cle}`)}</dt>
            <dd className="text-xs leading-relaxed text-gray-700 dark:text-gray-300" dir="auto">
              {formater(cle, infos[cle])}
            </dd>
          </div>
        ) : (
          <div key={cle} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{t(`fiche.couvertureCles.${cle}`)}</dt>
            <dd className="text-end font-medium break-words min-w-0" dir="auto">
              {formater(cle, infos[cle])}
            </dd>
          </div>
        )
      )}
    </dl>
  );
};
