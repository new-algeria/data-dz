import { useEffect, useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appelerApi, ErreurApi } from "@/lib/api";
import { fichierDemande, lienRetourTelechargement, lienTelechargementSite, PARAMETRE_TELECHARGEMENT } from "@/lib/telechargement";
import { formaterTaille, sourcesDesFichiers } from "@/lib/fichiers";
import { aSourceConvertible, telechargementsRessource } from "@/lib/fiche";
import { useLangue } from "@/hooks/use-langue";
import { useAuth } from "@/contexte/ContexteAuth";
import type { Ressource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconeFormat } from "./BadgeFormat";
import { MentionSource } from "./MentionSource";
import { ConnexionTelechargement } from "./ConnexionTelechargement";

const ORDRE = ["csv", "xlsx", "json", "geojson", "parquet", "ics", "pdf", "xml", "zip"];
// Formats connus dans l'ordre ci-dessus, formats inconnus à la fin.
const rang = (format: string) => {
  const indice = ORDRE.indexOf(format);
  return indice === -1 ? ORDRE.length : indice;
};


interface DialogueTelechargementProps {
  ressources: Ressource[];
  slug: string;
  /** Affiche un échantillon des données tabulaires dans le dialogue (fiche détaillée). */
  apercu?: boolean;
  /** Fichier choisi à l'ouverture (sinon le principal). */
  nomInitial?: string;
  /** Bouton qui ouvre le dialogue (sinon le grand bouton « Télécharger » de l'en-tête) ; `null` : aucun bouton. */
  declencheur?: ReactElement | null;
  /** Ouverture pilotée de l'extérieur (ex. depuis un menu, qui se ferme avant le dialogue). */
  ouvert?: boolean;
  onOuvertChange?: (ouvert: boolean) => void;
  /**
   * Rouvre le dialogue au retour de la connexion (`?download=<fichier>` dans l'URL de la fiche). Un seul dialogue
   * par page doit l'activer : celui de l'en-tête de la fiche.
   */
  rouvrirApresConnexion?: boolean;
}

/**
 * Téléchargement d'une donnée : choix du fichier (s'il y en a plusieurs) et du format, conversion par l'API.
 * Même dialogue pour le bouton principal de l'en-tête et pour chaque fichier de la liste (`ListeFichiers`).
 * Il faut être connecté pour télécharger : un visiteur voit d'abord l'étape de connexion (`ConnexionTelechargement`),
 * puis revient sur la fiche, où le dialogue se rouvre sur le fichier choisi.
 */
export const DialogueTelechargement = ({ ressources, slug, apercu: afficherApercu = false, nomInitial, declencheur, ouvert: ouvertExterne, onOuvertChange, rouvrirApresConnexion = false }: DialogueTelechargementProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { session, chargement } = useAuth();
  const [parametres, setParametres] = useSearchParams();
  const [nomRetour, setNomRetour] = useState<string | null>(null);
  const [ouvertInterne, setOuvertInterne] = useState(false);
  const ouvert = ouvertExterne ?? ouvertInterne;
  const setOuvert = (valeur: boolean) => {
    if (ouvertExterne === undefined) setOuvertInterne(valeur);
    onOuvertChange?.(valeur);
  };
  const nomParDefaut = () => nomRetour ?? nomInitial ?? (ressources.find((ressource) => ressource.principal) ?? ressources[0])?.nom ?? "";
  const [nom, setNom] = useState(nomParDefaut);
  const [format, setFormat] = useState("csv");
  const [statut, setStatut] = useState<"pret" | "conversion" | "erreur">("pret");
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<Record<string, unknown>[]>([]);
  const [etatApercu, setEtatApercu] = useState<"repos" | "chargement" | "pret" | "erreur">("repos");

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

  // Retour de la connexion : la fiche rouvre le dialogue sur le fichier choisi, puis retire le paramètre de l'URL.
  const demande = rouvrirApresConnexion ? parametres.get(PARAMETRE_TELECHARGEMENT) : null;
  useEffect(() => {
    if (!demande || !session) return;
    const fichier = fichierDemande(demande, ressources.map((element) => element.nom));
    if (fichier) {
      setNomRetour(fichier);
      setNom(fichier);
      setOuvert(true);
    }
    const suite = new URLSearchParams(parametres);
    suite.delete(PARAMETRE_TELECHARGEMENT);
    setParametres(suite, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, à l'arrivée de la session
  }, [demande, session]);

  const ressource = ressources.find((element) => element.nom === nom) ?? ressources[0];
  const apercuPossible = Boolean(session && afficherApercu && ressource && aSourceConvertible(ressource));

  useEffect(() => {
    if (!ouvert || !apercuPossible || !ressource) {
      setApercu([]);
      setEtatApercu("repos");
      return;
    }

    const controleur = new AbortController();
    const params = new URLSearchParams({ file: ressource.nom, n: "5" });
    setApercu([]);
    setEtatApercu("chargement");
    appelerApi<{ fichier: string; data: Record<string, unknown>[] }>(
      `/v1/datasets/${encodeURIComponent(slug)}/sample?${params}`,
      { signal: controleur.signal }
    )
      .then((reponse) => {
        setApercu(reponse.data);
        setEtatApercu("pret");
      })
      .catch(() => {
        if (!controleur.signal.aborted) setEtatApercu("erreur");
      });

    return () => controleur.abort();
  }, [apercuPossible, ouvert, ressource, slug]);

  if (!ressource) return null;
  const plusieursSources = sourcesDesFichiers(ressources).length > 1;
  const telechargements = [...telechargementsRessource(ressource)].sort((a, b) => rang(a.format) - rang(b.format));
  if (telechargements.length === 0) return null;
  // Sous le bouton : uniquement les conversions possibles et les formats natifs réellement fournis.
  const formatsDisponibles = [...new Set(ressources.flatMap((element) => telechargementsRessource(element).map((telechargement) => telechargement.format)))].sort(
    (a, b) => rang(a) - rang(b)
  );
  const choisi = telechargements.find((element) => element.format === format) ?? telechargements[0];
  const colonnesApercu = apercu.length > 0 ? Object.keys(apercu[0] ?? {}).slice(0, 6) : [];

  const choisir = (suite: () => void) => {
    suite();
    setStatut("pret");
    setErreur(null);
  };

  const telecharger = async () => {
    setStatut("conversion");
    setErreur(null);
    try {
      // Un seul téléchargement enregistré, avec le compte du membre (route download-link de l'API).
      window.location.assign(await lienTelechargementSite(slug, ressource.nom, choisi.format));
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

      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", session ? "sm:max-w-5xl" : "sm:max-w-md")}>
        {!session ? (
          chargement ? (
            <div className="flex justify-center py-16" role="status" aria-label={t("telechargement.connexion.verification")}>
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" aria-hidden />
            </div>
          ) : (
            <ConnexionTelechargement suite={lienRetourTelechargement(slug, ressource.nom)} />
          )
        ) : (
        <>
        <DialogHeader>
          <DialogTitle>{t("telechargement.titre")}</DialogTitle>
          <DialogDescription>{t("telechargement.description")}</DialogDescription>
        </DialogHeader>

        <div className={apercuPossible ? "grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "space-y-5"}>
          <div className="space-y-5">
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
                        {plusieursSources && element.source && <span className="ms-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">{element.source.nom}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {plusieursSources && ressource.source && <MentionSource source={ressource.source} licence={ressource.licence_code} />}
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
          </div>

          {apercuPossible && (
            <section className="min-w-0 rounded-xl border bg-muted/20 p-3" aria-live="polite">
              <div>
                <h3 className="font-semibold">{t("telechargement.apercu.titre")}</h3>
                <p className="text-xs text-muted-foreground">{t("telechargement.apercu.description")}</p>
              </div>
              {etatApercu === "chargement" ? (
                <p className="py-8 text-center text-sm text-muted-foreground" role="status">{t("telechargement.apercu.chargement")}</p>
              ) : etatApercu === "erreur" ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("telechargement.apercu.erreur")}</p>
              ) : apercu.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("telechargement.apercu.vide")}</p>
              ) : (
                <div className="mt-3 max-h-72 overflow-auto rounded-lg border bg-background">
                  <table className="w-full min-w-max text-start text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>{colonnesApercu.map((colonne) => <th key={colonne} scope="col" className="px-2 py-2 text-start font-semibold">{colonne}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {apercu.map((ligne, indice) => (
                        <tr key={indice} className="align-top">
                          {colonnesApercu.map((colonne) => {
                            const valeur = ligne[colonne];
                            const texte = valeur === null || valeur === undefined ? "—" : typeof valeur === "object" ? JSON.stringify(valeur) : String(valeur);
                            return <td key={colonne} className="max-w-48 truncate px-2 py-2" title={texte}>{texte}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

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
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};
