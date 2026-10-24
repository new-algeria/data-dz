import { useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErreurApi } from "@/lib/api";
import { formaterTaille } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { FormatTelechargement, Ressource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconeFormat } from "./BadgeFormat";

const ORDRE: FormatTelechargement[] = ["csv", "xlsx", "json", "geojson"];

/**
 * Vérifie le lien avant d'ouvrir le téléchargement : l'API répond 302 (fichier prêt, éventuellement converti)
 * ou une erreur lisible (ex. pas de coordonnées pour un GeoJSON). Sans cette étape, l'erreur s'afficherait
 * en JSON brut dans un nouvel onglet.
 */
async function verifierLien(url: string): Promise<void> {
  const reponse = await fetch(url, { redirect: "manual" });
  if (reponse.type === "opaqueredirect" || (reponse.status >= 300 && reponse.status < 400)) return;
  const corps = await reponse.json().catch(() => null);
  throw new ErreurApi(reponse.status, corps?.code ?? "http_error", corps?.title ?? `HTTP ${reponse.status}`);
}

/** Bouton principal de la fiche : choix du fichier (s'il y en a plusieurs) et du format, conversion par l'API. */
export const DialogueTelechargement = ({ ressources }: { ressources: Ressource[] }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(() => (ressources.find((ressource) => ressource.principal) ?? ressources[0])?.nom ?? "");
  const [format, setFormat] = useState<FormatTelechargement>("csv");
  const [statut, setStatut] = useState<"pret" | "conversion" | "erreur">("pret");
  const [erreur, setErreur] = useState<string | null>(null);

  const ressource = ressources.find((element) => element.nom === nom) ?? ressources[0];
  if (!ressource) return null;
  const telechargements = [...ressource.telechargements].sort((a, b) => ORDRE.indexOf(a.format) - ORDRE.indexOf(b.format));
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
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-auto justify-start gap-3 bg-emerald-700 py-3 text-white shadow-lg shadow-emerald-700/25 hover:bg-emerald-800">
          <Download className="h-5 w-5" />
          <span className="flex flex-col items-start leading-tight">
            <span className="font-semibold">{t("fiche.telecharger")}</span>
            <span className="text-xs font-normal opacity-80" dir="ltr">
              CSV · Excel · JSON · GeoJSON
            </span>
          </span>
        </Button>
      </DialogTrigger>

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
                      {t(`telechargement.formats.${element.format}.nom`)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {element.natif
                        ? [t("telechargement.original"), original?.taille_octets ? formaterTaille(original.taille_octets, langue) : null].filter(Boolean).join(" · ")
                        : t(`telechargement.formats.${element.format}.aide`)}
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
