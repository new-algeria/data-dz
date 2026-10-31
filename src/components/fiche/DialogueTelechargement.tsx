import { useState, type ReactElement } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErreurApi } from "@/lib/api";
import { verifierLien } from "@/lib/telechargement";
import { formaterTaille } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { FormatTelechargement, Ressource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconeFormat } from "./BadgeFormat";

const ORDRE: FormatTelechargement[] = ["csv", "xlsx", "json", "geojson", "parquet"];
// Formats connus dans l'ordre ci-dessus, formats inconnus à la fin.
const rang = (format: string) => {
  const indice = ORDRE.indexOf(format as FormatTelechargement);
  return indice === -1 ? ORDRE.length : indice;
};


interface DialogueTelechargementProps {
  ressources: Ressource[];
  /** Fichier choisi à l'ouverture (sinon le principal). */
  nomInitial?: string;
  /** Bouton qui ouvre le dialogue (sinon le grand bouton « Télécharger » de l'en-tête) ; `null` : aucun bouton. */
  declencheur?: ReactElement | null;
  /** Ouverture pilotée de l'extérieur (ex. depuis un menu, qui se ferme avant le dialogue). */
  ouvert?: boolean;
  onOuvertChange?: (ouvert: boolean) => void;
}

/**
 * Téléchargement d'une donnée : choix du fichier (s'il y en a plusieurs) et du format, conversion par l'API.
 * Même dialogue pour le bouton principal de l'en-tête et pour chaque fichier de la liste (`ListeFichiers`).
 */
export const DialogueTelechargement = ({ ressources, nomInitial, declencheur, ouvert: ouvertExterne, onOuvertChange }: DialogueTelechargementProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [ouvertInterne, setOuvertInterne] = useState(false);
  const ouvert = ouvertExterne ?? ouvertInterne;
  const setOuvert = (valeur: boolean) => {
    if (ouvertExterne === undefined) setOuvertInterne(valeur);
    onOuvertChange?.(valeur);
  };
  const nomParDefaut = () => nomInitial ?? (ressources.find((ressource) => ressource.principal) ?? ressources[0])?.nom ?? "";
  const [nom, setNom] = useState(nomParDefaut);
  const [format, setFormat] = useState<FormatTelechargement>("csv");
  const [statut, setStatut] = useState<"pret" | "conversion" | "erreur">("pret");
  const [erreur, setErreur] = useState<string | null>(null);

  // Chaque ouverture (bouton ou pilotage extérieur) repart du fichier demandé.
  const [ouvertAvant, setOuvertAvant] = useState(ouvert);
  if (ouvert !== ouvertAvant) {
    setOuvertAvant(ouvert);
    if (ouvert) {
      setNom(nomParDefaut());
      setStatut("pret");
      setErreur(null);
    }
  }

  const ressource = ressources.find((element) => element.nom === nom) ?? ressources[0];
  if (!ressource) return null;
  const telechargements = [...ressource.telechargements].sort((a, b) => rang(a.format) - rang(b.format));
  // Sous le bouton : uniquement les formats réellement proposés par l'API pour ce jeu.
  const formatsDisponibles = [...new Set(ressources.flatMap((element) => element.telechargements.map((telechargement) => telechargement.format)))].sort(
    (a, b) => rang(a) - rang(b)
  );
  const choisi = telechargements.find((element) => element.format === format) ?? telechargements[0];

  const choisir = (suite: () => void) => {
    suite();
    setStatut("pret");
    setErreur(null);
  };

  const telecharger = async () => {
    setStatut("conversion");
    setErreur(null);
    try {
      await verifierLien(choisi.url);
      window.location.assign(choisi.url);
      setStatut("pret");
      setOuvert(false);
    } catch (probleme) {
      setStatut("erreur");
      setErreur(probleme instanceof ErreurApi && probleme.statut === 422 ? t("telechargement.indisponible") : t("telechargement.erreur"));
    }
  };

  return (
    <Dialog
      open={ouvert}
      onOpenChange={setOuvert}
    >
      {declencheur !== null && (
        <DialogTrigger asChild>
          {declencheur ?? (
            <Button size="lg" className="h-auto justify-start gap-3 bg-emerald-700 py-3 text-white shadow-lg shadow-emerald-700/25 hover:bg-emerald-800">
              <Download className="h-5 w-5" />
              <span className="flex flex-col items-start leading-tight">
                <span className="font-semibold">{t("fiche.telecharger")}</span>
                {formatsDisponibles.length > 0 && (
                  <span className="text-xs font-normal opacity-80" dir="ltr">
                    {formatsDisponibles.map((element) => t(`telechargement.formatsCourts.${element}`, { defaultValue: element.toUpperCase() })).join(" · ")}
                  </span>
                )}
              </span>
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("telechargement.titre")}</DialogTitle>
          <DialogDescription>{t("telechargement.description")}</DialogDescription>
        </DialogHeader>

        {ressources.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="telechargement-fichier">{t("telechargement.fichier")}</Label>
            <Select value={ressource.nom} onValueChange={(valeur) => choisir(() => setNom(valeur))}>
              <SelectTrigger id="telechargement-fichier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ressources.map((element) => (
                  <SelectItem key={element.nom} value={element.nom}>
                    <span dir="ltr">{element.nom}</span>
                    {element.principal && <span className="ms-2 text-xs text-muted-foreground">{t("fiche.principal")}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t("telechargement.format")}</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {telechargements.map((element) => {
              const actif = element.format === choisi.format;
              const original = ressource.fichiers.find((fichier) => fichier.format === element.format);
              return (
                <button
                  key={element.format}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => choisir(() => setFormat(element.format))}
                  className={cn(
                    "relative flex items-start gap-3 rounded-xl border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    actif ? "border-emerald-600 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10" : "hover:bg-muted/60"
                  )}
                >
                  <IconeFormat format={element.format} className="h-9 w-9" />
                  <span className="min-w-0">
                    <span className="block font-semibold" dir="ltr">
                      {t(`telechargement.formats.${element.format}.nom`, { defaultValue: element.format.toUpperCase() })}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {element.natif
                        ? [t("telechargement.original"), original?.taille_octets ? formaterTaille(original.taille_octets, langue) : null].filter(Boolean).join(" · ")
                        : t(`telechargement.formats.${element.format}.aide`, { defaultValue: "" })}
                    </span>
                  </span>
                  {actif && <Check className="absolute end-2 top-2 h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {erreur && (
          <p role="alert" className="text-sm text-destructive">
            {erreur}
          </p>
        )}

        <DialogFooter>
          <Button onClick={telecharger} disabled={statut === "conversion"} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
            {statut === "conversion" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {statut === "conversion" ? t("telechargement.preparation") : t("telechargement.bouton", { format: choisi.format.toUpperCase() })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
