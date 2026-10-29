import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, RotateCcw, Star, Trash2, Upload } from "lucide-react";
import { ChoixSource } from "@/components/admin/ChoixSource";
import { useSourcesAdmin } from "@/hooks/use-sources-admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  chargerLicencesApi,
  creerDonnee,
  envoyerIllustration,
  formatDuFichier,
  modifierDonnee,
  preparerIllustration,
  publierFichiers,
  retirerIllustration,
  STATUTS_DONNEE,
  TAILLE_MAX_FICHIER,
  type ChampsDonnee,
  type DonneeAdmin,
  type StatutDonnee,
} from "@/lib/admin-donnees";
import { chargerCategories } from "@/lib/catalogue";
import { formaterTaille } from "@/lib/fichiers";
import { urlIllustration } from "@/lib/illustrations";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { LANGUES as LANGUES_SITE } from "@/lib/langues";
import { cn } from "@/lib/utils";

const AUCUNE = "aucune";
const LANGUES = LANGUES_SITE.map((langue) => langue.code);

/** Slug d'URL tiré du titre français : minuscules, sans accents, mots séparés par des tirets. */
function slugDepuisTitre(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface Formulaire {
  slug: string;
  titre: Record<(typeof LANGUES)[number], string>;
  description: Record<(typeof LANGUES)[number], string>;
  categorie: string;
  source: string;
  licence: string;
  licenceDetails: string;
  urlSource: string;
  motsCles: string;
  statut: StatutDonnee;
  numero: string;
  notes: string;
}

const vide = (): Formulaire => ({
  slug: "",
  titre: { fr: "", en: "", ar: "" },
  description: { fr: "", en: "", ar: "" },
  categorie: AUCUNE,
  source: "communaute",
  licence: AUCUNE,
  licenceDetails: "",
  urlSource: "",
  motsCles: "",
  statut: "brouillon",
  numero: "",
  notes: "",
});

function depuisDonnee(donnee: DonneeAdmin): Formulaire {
  return {
    ...vide(),
    slug: donnee.slug,
    titre: { fr: donnee.titre.fr ?? "", en: donnee.titre.en ?? "", ar: donnee.titre.ar ?? "" },
    description: { fr: donnee.description?.fr ?? "", en: donnee.description?.en ?? "", ar: donnee.description?.ar ?? "" },
    categorie: donnee.categorie_slug ?? AUCUNE,
    source: donnee.sources?.slug ?? "communaute",
    licence: donnee.licence_code ?? AUCUNE,
    licenceDetails: donnee.licence_details ?? "",
    urlSource: donnee.url_source ?? "",
    motsCles: (donnee.mots_cles ?? []).join(", "),
    statut: donnee.statut,
  };
}

const sansVides = (textes: Record<string, string>) =>
  Object.fromEntries(Object.entries(textes).map(([langue, texte]) => [langue, texte.trim()]).filter(([, texte]) => texte));

interface DialogueDonneeProps {
  /** Donnée à modifier, ou `null` pour en créer une. */
  donnee: DonneeAdmin | null;
  ouvert: boolean;
  onFermer: () => void;
  onEnregistre: (slug: string) => void;
}

/** Création et modification d'une donnée : métadonnées, illustration, nouvelle version de fichiers. */
export const DialogueDonnee = ({ donnee, ouvert, onFermer, onEnregistre }: DialogueDonneeProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const creation = donnee === null;
  const [formulaire, setFormulaire] = useState<Formulaire>(vide);
  const [slugManuel, setSlugManuel] = useState(false);
  const [illustration, setIllustration] = useState<{ blob: Blob; apercu: string } | null>(null);
  const [retirer, setRetirer] = useState(false);
  const [fichiers, setFichiers] = useState<{ fichier: File; principal: boolean }[]>([]);
  const [etape, setEtape] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const { data: sources = [] } = useSourcesAdmin();
  const { data: licences = [] } = useQuery({ queryKey: ["licences-api"], queryFn: chargerLicencesApi, staleTime: 60 * 60 * 1000 });

  useEffect(() => {
    if (!ouvert) return;
    setFormulaire(donnee ? depuisDonnee(donnee) : vide());
    setSlugManuel(!creation);
    setIllustration(null);
    setRetirer(false);
    setFichiers([]);
    setEtape(null);
    setErreur(null);
  }, [ouvert, donnee, creation]);

  useEffect(() => () => {
    if (illustration) URL.revokeObjectURL(illustration.apercu);
  }, [illustration]);

  const synchronisee = useMemo(() => sources.find((source) => source.slug === formulaire.source)?.type === "synchronisee", [sources, formulaire.source]);
  const modifier = <K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) => setFormulaire((actuel) => ({ ...actuel, [champ]: valeur }));
  const enCours = etape !== null;

  const changerTitreFr = (valeur: string) =>
    setFormulaire((actuel) => ({ ...actuel, titre: { ...actuel.titre, fr: valeur }, slug: slugManuel ? actuel.slug : slugDepuisTitre(valeur) }));

  const choisirImage = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreur(null);
    try {
      const blob = await preparerIllustration(fichier);
      setIllustration({ blob, apercu: URL.createObjectURL(blob) });
      setRetirer(false);
    } catch {
      setErreur(t("adminDonnees.erreurImage"));
    }
  };

  const ajouterFichiers = (liste: FileList | null) => {
    if (!liste) return;
    const acceptes = [...liste].filter((fichier) => formatDuFichier(fichier) && fichier.size <= TAILLE_MAX_FICHIER);
    if (acceptes.length < liste.length) setErreur(t("adminDonnees.fichiersRefuses"));
    setFichiers((actuels) => {
      const suivants = [...actuels, ...acceptes.map((fichier) => ({ fichier, principal: false }))];
      if (!suivants.some((element) => element.principal) && suivants[0]) suivants[0] = { ...suivants[0], principal: true };
      return suivants;
    });
  };

  const enregistrer = async () => {
    setErreur(null);
    if (!formulaire.titre.fr.trim()) return setErreur(t("adminDonnees.titreObligatoire"));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formulaire.slug)) return setErreur(t("adminDonnees.slugInvalide"));

    const champs: ChampsDonnee = {
      titre: { ...sansVides(formulaire.titre), fr: formulaire.titre.fr.trim() },
      description: Object.keys(sansVides(formulaire.description)).length ? sansVides(formulaire.description) : null,
      categorie_slug: formulaire.categorie === AUCUNE ? null : formulaire.categorie,
      source_slug: formulaire.source,
      licence_code: formulaire.licence === AUCUNE ? null : formulaire.licence,
      licence_details: formulaire.licenceDetails.trim() || null,
      url_source: formulaire.urlSource.trim() || null,
      mots_cles: formulaire.motsCles.split(",").map((mot) => mot.trim()).filter(Boolean),
      statut: formulaire.statut,
    };

    try {
      setEtape(t("adminDonnees.etapes.enregistrement"));
      if (creation) await creerDonnee(formulaire.slug, champs);
      else await modifierDonnee(formulaire.slug, champs);

      if (illustration) {
        setEtape(t("adminDonnees.etapes.illustration"));
        await envoyerIllustration(formulaire.slug, illustration.blob);
      } else if (retirer) {
        await retirerIllustration(formulaire.slug);
      }

      if (fichiers.length > 0) {
        await publierFichiers(formulaire.slug, fichiers, { numero: formulaire.numero.trim(), notes: formulaire.notes.trim() }, (envoyes, total) =>
          setEtape(t("adminDonnees.etapes.fichiers", { envoyes, total }))
        );
      }
      onEnregistre(formulaire.slug);
    } catch (probleme) {
      setErreur(probleme instanceof Error ? probleme.message : t("adminDonnees.erreur"));
    } finally {
      setEtape(null);
    }
  };

  const apercuIllustration = illustration?.apercu ?? (retirer || !donnee ? null : urlIllustration(donnee));

  return (
    <Dialog open={ouvert} onOpenChange={(valeur) => !valeur && !enCours && onFermer()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{creation ? t("adminDonnees.nouvelle") : t("adminDonnees.modifier", { titre: texteTraduit(donnee.titre, langue) })}</DialogTitle>
          <DialogDescription>{creation ? t("adminDonnees.aideCreation") : t("adminDonnees.aideModification")}</DialogDescription>
        </DialogHeader>

        {synchronisee && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">{t("adminDonnees.avertissementSynchro")}</p>
        )}

        <div className="grid gap-5">
          {/* Illustration */}
          <section className="grid gap-2">
            <Label>{t("adminDonnees.illustration")}</Label>
            <div className="relative aspect-[5/3] overflow-hidden rounded-xl border bg-muted">
              {apercuIllustration ? (
                <img src={apercuIllustration} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("adminDonnees.illustrationParDefaut")}</div>
              )}
              <div className="absolute bottom-2 end-2 flex gap-2">
                <Button asChild size="sm" variant="secondary" className="cursor-pointer gap-1.5 shadow">
                  <label>
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    {t("adminDonnees.choisirImage")}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => choisirImage(e.target.files?.[0])} />
                  </label>
                </Button>
                {(illustration || donnee?.illustration_url) && !retirer && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 shadow"
                    onClick={() => {
                      setIllustration(null);
                      setRetirer(Boolean(donnee?.illustration_url));
                    }}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    {t("adminDonnees.imageParDefaut")}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("adminDonnees.aideIllustration")}</p>
          </section>

          {/* Titre et description */}
          <Tabs defaultValue="fr">
            <TabsList>
              {LANGUES.map((code) => (
                <TabsTrigger key={code} value={code}>
                  {LANGUES_SITE.find((langueSite) => langueSite.code === code)?.nom}
                </TabsTrigger>
              ))}
            </TabsList>
            {LANGUES.map((code) => (
              <TabsContent key={code} value={code} className="grid gap-3" dir={code === "ar" ? "rtl" : "ltr"}>
                <div className="grid gap-1.5">
                  <Label htmlFor={`titre-${code}`}>
                    {t("adminDonnees.champs.titre")}
                    {code === "fr" && " *"}
                  </Label>
                  <Input
                    id={`titre-${code}`}
                    value={formulaire.titre[code]}
                    maxLength={300}
                    onChange={(e) => (code === "fr" ? changerTitreFr(e.target.value) : modifier("titre", { ...formulaire.titre, [code]: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`description-${code}`}>{t("adminDonnees.champs.description")}</Label>
                  <Textarea
                    id={`description-${code}`}
                    rows={3}
                    maxLength={5000}
                    value={formulaire.description[code]}
                    onChange={(e) => modifier("description", { ...formulaire.description, [code]: e.target.value })}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="slug">{t("adminDonnees.champs.slug")}</Label>
              <Input
                id="slug"
                dir="ltr"
                value={formulaire.slug}
                disabled={!creation}
                onChange={(e) => {
                  setSlugManuel(true);
                  modifier("slug", e.target.value.toLowerCase());
                }}
              />
              {creation && <p className="text-xs text-muted-foreground">{t("adminDonnees.aideSlug")}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>{t("adminDonnees.champs.statut")}</Label>
              <Select value={formulaire.statut} onValueChange={(valeur) => modifier("statut", valeur as StatutDonnee)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS_DONNEE.map((statut) => (
                    <SelectItem key={statut} value={statut}>
                      {t(`adminDonnees.statuts.${statut}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("adminDonnees.champs.categorie")}</Label>
              <Select value={formulaire.categorie} onValueChange={(valeur) => modifier("categorie", valeur)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUCUNE}>{t("adminDonnees.aucune")}</SelectItem>
                  {categories.map((categorie) => (
                    <SelectItem key={categorie.slug} value={categorie.slug}>
                      {texteTraduit(categorie.nom, langue)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="source">{t("adminDonnees.champs.source")}</Label>
              <ChoixSource id="source" valeur={formulaire.source} onChange={(valeur) => modifier("source", valeur)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("adminDonnees.champs.licence")}</Label>
              <Select value={formulaire.licence} onValueChange={(valeur) => modifier("licence", valeur)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUCUNE}>{t("adminDonnees.aucune")}</SelectItem>
                  {licences.map((licence) => (
                    <SelectItem key={licence.code} value={licence.code}>
                      <span dir="ltr">{licence.code}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{licence.nom}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="url-source">{t("adminDonnees.champs.urlSource")}</Label>
              <Input id="url-source" type="url" dir="ltr" placeholder="https://" value={formulaire.urlSource} onChange={(e) => modifier("urlSource", e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="licence-details">{t("adminDonnees.champs.licenceDetails")}</Label>
              <Input id="licence-details" value={formulaire.licenceDetails} maxLength={2000} onChange={(e) => modifier("licenceDetails", e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="mots-cles">{t("adminDonnees.champs.motsCles")}</Label>
              <Input id="mots-cles" value={formulaire.motsCles} placeholder={t("adminDonnees.aideMotsCles")} onChange={(e) => modifier("motsCles", e.target.value)} />
            </div>
          </div>

          {/* Fichiers : nouvelle version */}
          <section className="grid gap-3 rounded-xl border p-4">
            <div>
              <h3 className="font-semibold">{creation ? t("adminDonnees.fichiers") : t("adminDonnees.nouvelleVersion")}</h3>
              <p className="text-xs text-muted-foreground">{t("adminDonnees.aideFichiers")}</p>
            </div>
            {fichiers.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {fichiers.map(({ fichier, principal }, indice) => (
                  <li key={`${fichier.name}-${indice}`} className="flex items-center gap-2 p-2 text-sm">
                    <button
                      type="button"
                      title={t("fiche.principal")}
                      aria-pressed={principal}
                      onClick={() => setFichiers((liste) => liste.map((element, i) => ({ ...element, principal: i === indice })))}
                      className={cn("rounded-full p-1", principal ? "text-amber-500" : "text-muted-foreground hover:text-foreground")}
                    >
                      <Star className={cn("h-4 w-4", principal && "fill-current")} aria-hidden />
                      <span className="sr-only">{t("fiche.principal")}</span>
                    </button>
                    <span className="min-w-0 flex-1 truncate" dir="ltr">
                      {fichier.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{formaterTaille(fichier.size, langue)}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t("adminDonnees.retirerFichier")}
                      onClick={() =>
                        setFichiers((liste) => {
                          const suivants = liste.filter((_, i) => i !== indice);
                          if (suivants[0] && !suivants.some((element) => element.principal)) suivants[0] = { ...suivants[0], principal: true };
                          return suivants;
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" className="w-fit cursor-pointer gap-2">
              <label>
                <Upload className="h-4 w-4" aria-hidden />
                {t("adminDonnees.ajouterFichiers")}
                <input
                  type="file"
                  multiple
                  accept=".json,.geojson,.csv,application/json,application/geo+json,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    ajouterFichiers(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
            {fichiers.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                <div className="grid gap-1.5">
                  <Label htmlFor="numero">{t("adminDonnees.champs.numero")}</Label>
                  <Input id="numero" dir="ltr" placeholder="1.0.0" value={formulaire.numero} onChange={(e) => modifier("numero", e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="notes">{t("adminDonnees.champs.notes")}</Label>
                  <Input id="notes" value={formulaire.notes} maxLength={2000} onChange={(e) => modifier("notes", e.target.value)} />
                </div>
              </div>
            )}
          </section>
        </div>

        {erreur && (
          <p role="alert" className="text-sm text-destructive">
            {erreur}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onFermer} disabled={enCours}>
            {t("adminDonnees.annuler")}
          </Button>
          <Button type="button" onClick={enregistrer} disabled={enCours} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
            {enCours && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {etape ?? (creation ? t("adminDonnees.creer") : t("adminDonnees.enregistrer"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
