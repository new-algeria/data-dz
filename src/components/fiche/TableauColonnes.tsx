import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Colonne } from "@/lib/types";

export const TableauColonnes = ({ colonnes }: { colonnes: Colonne[] }) => {
  const { t } = useTranslation();

  if (colonnes.length === 0) {
    return <p className="text-muted-foreground">{t("fiche.aucuneColonne")}</p>;
  }

  const avecDescription = colonnes.some((colonne) => colonne.description);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">{t("fiche.colonneNom")}</TableHead>
          <TableHead className="text-start">{t("fiche.colonneType")}</TableHead>
          {avecDescription && <TableHead className="text-start">{t("fiche.colonneDescription")}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {colonnes.map((colonne) => (
          <TableRow key={colonne.nom}>
            <TableCell className="font-mono text-xs" dir="ltr">
              {colonne.nom}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground" dir="ltr">
              {colonne.type ?? ""}
            </TableCell>
            {avecDescription && <TableCell dir="auto">{colonne.description ?? ""}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
