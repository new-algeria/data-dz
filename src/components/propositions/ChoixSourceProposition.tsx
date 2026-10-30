import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LONGUEUR_MAX_SOURCE_NOM } from "@/lib/formulaire-soumission";
import { chargerSources } from "@/lib/referentiels";
import { SOURCE_COMMUNAUTE, sourceCorrespondante } from "@/lib/sources";

const AUCUNE = "__aucune__";
const AUTRE = "__autre__";

interface ChoixSourcePropositionProps {
  id: string;
  sourceNom: string;
  sourceUrl: string;
  onChange: (modification: { sourceNom?: string; sourceUrl?: string }) => void;
}

/**
 * Source d'une proposition : menu des sources connues du catalogue, « Autre source » pour en taper une.
 * La base ne garde que le nom et l'adresse (`source_nom`, `source_url`) : choisir une source connue y écrit
 * son nom exact, que la mise en ligne reconnaît (`sourceCorrespondante()`).
 */
export const ChoixSourceProposition = ({ id, sourceNom, sourceUrl, onChange }: ChoixSourcePropositionProps) => {
  const { t } = useTranslation();
  const { data: toutes = [] } = useQuery({ queryKey: ["sources"], queryFn: chargerSources, staleTime: 60 * 60 * 1000 });
  // « Communauté » est la source par défaut de la mise en ligne : ce n'est pas un choix à proposer.
  const sources = useMemo(
    () => toutes.filter((source) => source.slug !== SOURCE_COMMUNAUTE).sort((a, b) => a.nom.localeCompare(b.nom)),
    [toutes]
  );
  const connue = sourceNom.trim() ? sourceCorrespondante(sources, sourceNom, null) : null;
  const [autreChoisi, setAutreChoisi] = useState(false);
  // Un nom tapé qui ne correspond à aucune source connue (ancienne proposition, « Autre ») reste en saisie libre.
  const modeAutre = autreChoisi || (sourceNom.trim() !== "" && !connue && sources.length > 0);
  const valeur = modeAutre ? AUTRE : (connue?.slug ?? AUCUNE);

  /** L'adresse préremplie avec le site de la source précédente suit le changement de source. */
  const adresseApres = (nouvelle: string | null | undefined) =>
    !sourceUrl.trim() || (connue?.url && sourceUrl.trim() === connue.url) ? (nouvelle ?? "") : sourceUrl;

  const choisir = (choix: string) => {
    if (choix === AUTRE) {
      setAutreChoisi(true);
      onChange({ sourceNom: connue ? "" : sourceNom, sourceUrl: adresseApres(null) });
      return;
    }
    setAutreChoisi(false);
    const source = sources.find((element) => element.slug === choix);
    onChange({ sourceNom: source?.nom ?? "", sourceUrl: adresseApres(source?.url) });
  };

  return (
    <div className="grid gap-2">
      <Select value={valeur} onValueChange={choisir}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUCUNE}>{t("propositions.champs.sourceNonPrecisee")}</SelectItem>
          {sources.map((source) => (
            <SelectItem key={source.slug} value={source.slug}>
              {source.nom}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={AUTRE}>{t("propositions.champs.sourceAutre")}</SelectItem>
        </SelectContent>
      </Select>
      {modeAutre && (
        <Input
          id={`${id}-autre`}
          aria-label={t("propositions.champs.sourceAutreNom")}
          placeholder={t("propositions.champs.sourceAutreNom")}
          value={sourceNom}
          onChange={(e) => onChange({ sourceNom: e.target.value })}
          maxLength={LONGUEUR_MAX_SOURCE_NOM}
          dir="auto"
          autoFocus={autreChoisi}
        />
      )}
    </div>
  );
};
