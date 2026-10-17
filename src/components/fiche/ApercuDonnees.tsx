import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estObjet, valeurEnTexte } from "@/lib/valeurs";
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {entetes.map((entete) => (
            <TableHead key={entete} className="text-start font-mono text-xs whitespace-nowrap" dir="ltr">
              {entete}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((ligne, indice) => (
          <TableRow key={indice}>
            {entetes.map((entete) => (
              <TableCell key={entete} className="text-xs align-top max-w-xs" dir="auto">
                {valeurEnTexte(ligne[entete])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
