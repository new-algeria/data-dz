import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, Eye, EyeOff, ExternalLink, Loader2 } from "lucide-react";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { LigneFichier } from "@/components/propositions/LigneFichier";
import { Button } from "@/components/ui/button";
import { aUnApercu, chargerApercu, LIGNES_APERCU, TAILLE_MAX_APERCU_JSON, type Cellule } from "@/lib/apercu";
import { cleErreurFichier } from "@/lib/erreurs";
import {
  extensionFichier,
  nomStocke,
  ouvrirFichierPrive,
  telechargerFichierPrive,
  urlSigneeFichier,
  type FichierSoumission,
} from "@/lib/soumissions";

const afficherCellule = (valeur: Cellule) => (valeur === null ? "∅" : String(valeur));

/** 20 premières lignes d'un CSV / JSON / GeoJSON proposé, lu via un lien signé. */
const ApercuFichier = ({ fichier }: { fichier: FichierSoumission }) => {
  const { t } = useTranslation();
  const format = extensionFichier(fichier.chemin_stockage);
  const requete = useQuery({
    queryKey: ["apercu-soumission", fichier.id],
    queryFn: async () => chargerApercu(await urlSigneeFichier(fichier.chemin_stockage), format),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (requete.isPending) {
    return (
      <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("moderation.revue.apercuChargement")}
      </p>
    );
  }
  if (requete.isError) {
    return (
      <div className="p-3">
        <MessageAuth type="erreur">{t("moderation.revue.apercuErreur")}</MessageAuth>
      </div>
    );
  }
  const { colonnes, lignes, tronque } = requete.data;
  if (lignes.length === 0) return <p className="p-4 text-sm text-muted-foreground">{t("moderation.revue.apercuVide")}</p>;

  return (
    <div className="space-y-2 p-3">
      <div className="max-h-[28rem] overflow-auto rounded-lg border" dir="ltr">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="border-b px-2 py-1.5 text-end font-mono text-muted-foreground">#</th>
              {colonnes.map((colonne, i) => (
                <th key={`${colonne}-${i}`} className="whitespace-nowrap border-b px-2 py-1.5 text-start font-semibold">
                  {colonne}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800">
                <td className="border-b px-2 py-1 text-end font-mono text-muted-foreground">{i + 1}</td>
                {colonnes.map((_, j) => (
                  <td key={j} className="max-w-[16rem] truncate border-b px-2 py-1" title={afficherCellule(ligne[j] ?? null)}>
                    {afficherCellule(ligne[j] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {tronque ? t("moderation.revue.apercuTronque", { nombre: LIGNES_APERCU }) : t("moderation.revue.apercuComplet", { count: lignes.length })}
      </p>
    </div>
  );
};

/** Fichiers d'une proposition côté modération : aperçu, ouverture et téléchargement (bucket privé). */
export const FichiersRevue = ({ fichiers }: { fichiers: FichierSoumission[] }) => {
  const { t } = useTranslation();
  const [ouverts, setOuverts] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  const executer = async (action: () => Promise<void>) => {
    setErreur(null);
    try {
      await action();
    } catch (e) {
      setErreur(t(cleErreurFichier(e)));
    }
  };

  if (fichiers.length === 0) return <p className="text-sm text-muted-foreground">{t("propositions.detail.aucunFichier")}</p>;

  return (
    <div className="space-y-3">
      {erreur && <MessageAuth type="erreur">{erreur}</MessageAuth>}
      <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">
        {fichiers.map((fichier) => {
          const format = extensionFichier(fichier.chemin_stockage);
          const tropLourd = format !== "csv" && (fichier.taille_octets ?? 0) > TAILLE_MAX_APERCU_JSON;
          const ouvert = ouverts.includes(fichier.id);
          const nom = nomStocke(fichier.chemin_stockage);
          return (
            <li key={fichier.id}>
              <LigneFichier
                element="div"
                nom={nom}
                taille={fichier.taille_octets}
                etat={
                  <span className="text-muted-foreground">
                    {fichier.nom_original !== nom && <span dir="auto">{t("moderation.revue.nomOriginal", { nom: fichier.nom_original })}</span>}
                    {aUnApercu(format) && tropLourd && <span className="block">{t("moderation.revue.apercuTropLourd")}</span>}
                  </span>
                }
                actions={
                  <>
                    {aUnApercu(format) && !tropLourd && (
                      <Button
                        type="button"
                        size="sm"
                        variant={ouvert ? "secondary" : "outline"}
                        className="gap-1.5"
                        aria-expanded={ouvert}
                        onClick={() => setOuverts((liste) => (ouvert ? liste.filter((id) => id !== fichier.id) : [...liste, fichier.id]))}
                      >
                        {ouvert ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {t("moderation.revue.apercu")}
                      </Button>
                    )}
                    {format === "pdf" && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => executer(() => ouvrirFichierPrive(fichier.chemin_stockage))} aria-label={t("moderation.revue.ouvrir", { nom })}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button type="button" size="icon" variant="ghost" onClick={() => executer(() => telechargerFichierPrive(fichier.chemin_stockage))} aria-label={t("propositions.detail.telecharger", { nom })}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                }
              />
              {ouvert && <ApercuFichier fichier={fichier} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
