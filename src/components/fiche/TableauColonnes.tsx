import { useTranslation } from "react-i18next";
import { BadgeType } from "./BadgeType";
import type { Colonne } from "@/lib/types";

export const TableauColonnes = ({ colonnes }: { colonnes: Colonne[] }) => {
  const { t } = useTranslation();

  if (colonnes.length === 0) {
    return <p className="text-muted-foreground">{t("fiche.aucuneColonne")}</p>;
  }

  const avecDescription = colonnes.some((colonne) => colonne.description);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted-foreground dark:bg-white/5">
          <tr>
            <th className="w-10 px-3 py-2.5 text-start font-medium">#</th>
            <th className="px-3 py-2.5 text-start font-medium">{t("fiche.colonneNom")}</th>
            <th className="px-3 py-2.5 text-start font-medium">{t("fiche.colonneType")}</th>
            {avecDescription && <th className="px-3 py-2.5 text-start font-medium">{t("fiche.colonneDescription")}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {colonnes.map((colonne, indice) => (
            <tr key={colonne.nom} className="transition-colors odd:bg-white even:bg-gray-50/60 hover:bg-emerald-50/60 dark:odd:bg-transparent dark:even:bg-white/[0.03] dark:hover:bg-emerald-500/10">
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{indice + 1}</td>
              <td className="px-3 py-2.5" dir="ltr">
                <code className="font-mono text-[13px] font-semibold text-gray-900 dark:text-gray-50">{colonne.nom}</code>
              </td>
              <td className="px-3 py-2.5">
                <BadgeType type={colonne.type} />
              </td>
              {avecDescription && (
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300" dir="auto">
                  {colonne.description ?? ""}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
