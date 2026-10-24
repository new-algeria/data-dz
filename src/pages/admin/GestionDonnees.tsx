import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Eye, EyeOff, ExternalLink, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { DialogueDonnee } from "@/components/admin/DialogueDonnee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLangue } from "@/hooks/use-langue";
import { useValeurDifferee } from "@/hooks/use-valeur-differee";
import { chargerDonneesAdmin, modifierDonnee, STATUTS_DONNEE, supprimerDonnee, type DonneeAdmin, type StatutDonnee } from "@/lib/admin-donnees";
import { formaterNombre, localeNombres } from "@/lib/fichiers";
import { urlIllustration } from "@/lib/illustrations";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

const TOUS = "tous";

const couleursStatut: Record<StatutDonnee, string> = {
  publie: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  brouillon: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  en_revue: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  archive: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
};

/** /admin/datasets : créer, modifier, masquer et supprimer les données du catalogue (via l'API). */
const GestionDonnees = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const clientRequetes = useQueryClient();
  const [saisie, setSaisie] = useState("");
  const terme = useValeurDifferee(saisie.trim(), 300);
  const [filtre, setFiltre] = useState<StatutDonnee | typeof TOUS>(TOUS);
  const [edition, setEdition] = useState<{ donnee: DonneeAdmin | null } | null>(null);
  const [aSupprimer, setASupprimer] = useState<DonneeAdmin | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);

  const requete = useQuery({
    queryKey: ["admin", "donnees", terme, filtre],
    queryFn: () => chargerDonneesAdmin(terme, filtre === TOUS ? null : filtre),
    placeholderData: keepPreviousData,
  });
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium" });

  /** Le site public lit l'API, dont le cache CDN dure 15 s : on rafraîchit tout de suite ce qu'on peut. */
  const rafraichir = async () => {
    await clientRequetes.invalidateQueries({ queryKey: ["admin", "donnees"] });
    for (const cle of ["catalogue", "fiche", "statistiques", "moderation"]) clientRequetes.invalidateQueries({ queryKey: [cle] });
  };

  const basculerVisibilite = async (donnee: DonneeAdmin) => {
    const statut: StatutDonnee = donnee.statut === "publie" ? "archive" : "publie";
    setEnCours(donnee.id);
    try {
      await modifierDonnee(donnee.slug, { statut });
      await rafraichir();
      toast.success(t(statut === "publie" ? "adminDonnees.publiee" : "adminDonnees.masquee", { titre: texteTraduit(donnee.titre, langue) }));
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : t("adminDonnees.erreur"));
    } finally {
      setEnCours(null);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    const donnee = aSupprimer;
    setASupprimer(null);
    setConfirmation("");
    setEnCours(donnee.id);
    try {
      await supprimerDonnee(donnee.slug);
      await rafraichir();
      toast.success(t("adminDonnees.supprimee", { titre: texteTraduit(donnee.titre, langue) }));
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : t("adminDonnees.erreur"));
    } finally {
      setEnCours(null);
    }
  };

  return (
    <MiseEnPage titre={t("adminDonnees.titre")} sousTitre={t("adminDonnees.sousTitre")} chemin={routes.adminDonnees} largeur="large">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={t("adminDonnees.rechercher")}
            aria-label={t("adminDonnees.rechercher")}
            className="ps-9 bg-white dark:bg-gray-900"
          />
        </div>
        <Select value={filtre} onValueChange={(valeur) => setFiltre(valeur as StatutDonnee | typeof TOUS)}>
          <SelectTrigger className="w-48 bg-white dark:bg-gray-900" aria-label={t("adminDonnees.filtrerStatut")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>{t("adminDonnees.tousStatuts")}</SelectItem>
            {STATUTS_DONNEE.map((statut) => (
              <SelectItem key={statut} value={statut}>
                {t(`adminDonnees.statuts.${statut}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setEdition({ donnee: null })} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
          <Plus className="h-4 w-4" aria-hidden />
          {t("adminDonnees.nouvelle")}
        </Button>
      </div>

      {requete.isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : requete.isError ? (
        <EtatErreur message={requete.error.message} onReessayer={() => requete.refetch()} />
      ) : requete.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{t("adminDonnees.aucune")}</p>
      ) : (
        <ul className={cn("grid gap-3 transition-opacity", requete.isPlaceholderData && "opacity-60")}>
          {requete.data.map((donnee) => {
            const titre = texteTraduit(donnee.titre, langue);
            return (
              <li
                key={donnee.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-gray-800"
              >
                <img
                  src={urlIllustration(donnee, "petite")}
                  alt=""
                  loading="lazy"
                  className="h-16 w-28 shrink-0 rounded-lg object-cover"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{titre}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", couleursStatut[donnee.statut])}>
                      {t(`adminDonnees.statuts.${donnee.statut}`)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                    {donnee.slug}
                    {donnee.sources && ` · ${donnee.sources.nom}`}
                    {donnee.versions && ` · v${donnee.versions.numero}`}
                    {donnee.versions?.nb_lignes != null && ` · ${formaterNombre(donnee.versions.nb_lignes, langue)} ${t("fiche.lignes").toLowerCase()}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("adminDonnees.majLe", { date: formatDate.format(new Date(donnee.mis_a_jour_le)) })}</p>
                </div>
                <div className="flex items-center gap-1">
                  {enCours === donnee.id && <Loader2 className="me-1 h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
                  {donnee.statut === "publie" && (
                    <Button asChild size="icon" variant="ghost" title={t("adminDonnees.voir")}>
                      <Link to={routes.donnee(donnee.slug)}>
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        <span className="sr-only">{t("adminDonnees.voir")}</span>
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={enCours === donnee.id}
                    onClick={() => basculerVisibilite(donnee)}
                    title={donnee.statut === "publie" ? t("adminDonnees.masquer") : t("adminDonnees.publier")}
                  >
                    {donnee.statut === "publie" ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    <span className="sr-only">{donnee.statut === "publie" ? t("adminDonnees.masquer") : t("adminDonnees.publier")}</span>
                  </Button>
                  <Button size="icon" variant="ghost" disabled={enCours === donnee.id} onClick={() => setEdition({ donnee })} title={t("adminDonnees.editer")}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{t("adminDonnees.editer")}</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={enCours === donnee.id}
                    onClick={() => setASupprimer(donnee)}
                    title={t("adminDonnees.supprimer")}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{t("adminDonnees.supprimer")}</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DialogueDonnee
        ouvert={edition !== null}
        donnee={edition?.donnee ?? null}
        onFermer={() => setEdition(null)}
        onEnregistre={async (slug) => {
          setEdition(null);
          await rafraichir();
          toast.success(t("adminDonnees.enregistree", { slug }));
        }}
      />

      <AlertDialog
        open={aSupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) {
            setASupprimer(null);
            setConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminDonnees.confirmerTitre")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminDonnees.confirmerTexte", { titre: aSupprimer ? texteTraduit(aSupprimer.titre, langue) : "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor="confirmation-slug" className="text-sm">
              {t("adminDonnees.confirmerSaisie", { slug: aSupprimer?.slug ?? "" })}
            </label>
            <Input id="confirmation-slug" dir="ltr" autoComplete="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adminDonnees.annuler")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmation !== aSupprimer?.slug}
              onClick={supprimer}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("adminDonnees.supprimerDefinitivement")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MiseEnPage>
  );
};

export default GestionDonnees;
