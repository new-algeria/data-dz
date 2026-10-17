import { useTranslation } from "react-i18next";
import { estObjet, valeurEnTexte } from "@/lib/valeurs";
import { BadgeType } from "./BadgeType";
import type { Colonne } from "@/lib/types";

interface ApercuDonneesProps {
  apercu: unknown;
  colonnes: Colonne[];
}

/** Transforme une entité GeoJSON en ligne plate (propriétés + type de géométrie). */
function aplatirLigne(ligne: Record<string, unknown>): Record<string, unknown> {
  if (ligne.type === "Feature" && estObjet(ligne.properties)) {
    const geometrie = estObjet(ligne.geometry) ? ligne.geometry.type : null;
    return { ...ligne.properties, ...(geometrie ? { geometry: geometrie } : {}) };
  }
  return ligne;
}

/** Valeur mise en forme selon son type : on repère d'un coup d'œil nombres, booléens et valeurs vides. */
const Cellule = ({ valeur }: { valeur: unknown }) => {
  if (valeur === null || valeur === undefined || valeur === "") {
    return <span className="font-mono text-xs italic text-gray-400 dark:text-gray-500">null</span>;
  }
  if (typeof valeur === "boolean") {
    return (
      <span
        className={
          valeur
            ? "rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
            : "rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300"
        }
      >
        {String(valeur)}
      </span>
    );
  }
  if (typeof valeur === "number") {
    return (
      <span className="font-mono text-[13px] font-medium tabular-nums text-violet-700 dark:text-violet-300" dir="ltr">
        {valeur}
      </span>
    );
  }
  if (typeof valeur === "object") {
    return (
      <code className="block truncate font-mono text-xs text-orange-700 dark:text-orange-300" dir="ltr" title={JSON.stringify(valeur)}>
        {valeurEnTexte(valeur)}
      </code>
    );
  }
  const texte = String(valeur);
  return (
    <span className="block truncate font-medium text-gray-900 dark:text-gray-100" dir="auto" title={texte.length > 60 ? texte : undefined}>
      {valeurEnTexte(texte)}
    </span>
  );
};

export const ApercuDonnees = ({ apercu, colonnes }: ApercuDonneesProps) => {
  const { t } = useTranslation();

  const lignesBrutes = estObjet(apercu) && Array.isArray(apercu.features) ? apercu.features : apercu;

  if (!Array.isArray(lignesBrutes) || lignesBrutes.length === 0) {
    if (estObjet(apercu)) {
      return (
        <pre className="text-xs bg-muted rounded-md p-4 overflow-x-auto" dir="ltr">
          {JSON.stringify(apercu, null, 2)}
        </pre>
      );
    }
    return <p className="text-muted-foreground">{t("fiche.apercuVide")}</p>;
  }

  const lignes = lignesBrutes.map((ligne) => (estObjet(ligne) ? aplatirLigne(ligne) : { valeur: ligne }));

  // Ordre des colonnes : celui décrit dans la version, puis les clés supplémentaires de l'aperçu.
  const entetes: string[] = [];
  const ajouterEntete = (nom: string) => {
    if (!entetes.includes(nom)) entetes.push(nom);
  };
  const clesPresentes = new Set(lignes.flatMap((ligne) => Object.keys(ligne)));
  colonnes.forEach((colonne) => clesPresentes.has(colonne.nom) && ajouterEntete(colonne.nom));
  clesPresentes.forEach(ajouterEntete);

  const typesParColonne = new Map(colonnes.map((colonne) => [colonne.nom, colonne.type]));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-white/5">
          <tr>
            {entetes.map((entete) => (
              <th key={entete} className="px-3 py-2.5 text-start align-bottom font-medium whitespace-nowrap">
                <span className="flex flex-col items-start gap-1">
                  <code className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-50" dir="ltr">
                    {entete}
                  </code>
                  <BadgeType type={typesParColonne.get(entete)} compact />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {lignes.map((ligne, indice) => (
            <tr key={indice} className="odd:bg-white even:bg-gray-50/60 hover:bg-emerald-50/60 dark:odd:bg-transparent dark:even:bg-white/[0.03] dark:hover:bg-emerald-500/10">
              {entetes.map((entete) => (
                <td key={entete} className="max-w-xs px-3 py-2.5 align-top">
                  <Cellule valeur={ligne[entete]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
