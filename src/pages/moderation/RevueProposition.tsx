import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ClipboardList, FolderCog, Loader2, MessageSquare, PencilLine, Rocket, XCircle, type LucideIcon } from "lucide-react";
import { MiseEnPage, Carte } from "@/components/MiseEnPage";
import { AvatarMembre } from "@/components/AvatarMembre";
import { EtatErreur } from "@/components/EtatErreur";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { FichiersRevue } from "@/components/moderation/FichiersRevue";
import { BadgeStatut } from "@/components/propositions/BadgeStatut";
import { ContenuProposition } from "@/components/propositions/ContenuProposition";
import { GestionFichiers } from "@/components/propositions/GestionFichiers";
import { HistoriqueRevues } from "@/components/propositions/HistoriqueRevues";
import { PropositionIntrouvable } from "@/components/propositions/PropositionIntrouvable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { mettreEnLigneProposition } from "@/lib/admin-donnees";
import { cleErreur } from "@/lib/erreurs";
import { champsVides, valeursDepuisSoumission } from "@/lib/formulaire-soumission";
import { localeNombres } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import {
  chargerSoumission,
  deciderSoumission,
  estModifiable,
  noterModification,
  type DecisionRevue,
  type Soumission,
  type StatutSoumission,
} from "@/lib/soumissions";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

const LONGUEUR_MAX_COMMENTAIRE = 2000;

const DECISIONS: { valeur: DecisionRevue; icone: LucideIcon; couleur: string }[] = [
  { valeur: "acceptee", icone: CheckCircle2, couleur: "peer-checked:border-emerald-600 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-500/10" },
  { valeur: "modifications_demandees", icone: PencilLine, couleur: "peer-checked:border-amber-500 peer-checked:bg-amber-50 dark:peer-checked:bg-amber-500/10" },
  { valeur: "refusee", icone: XCircle, couleur: "peer-checked:border-red-600 peer-checked:bg-red-50 dark:peer-checked:bg-red-500/10" },
  { valeur: "commentaire", icone: MessageSquare, couleur: "peer-checked:border-sky-600 peer-checked:bg-sky-50 dark:peer-checked:bg-sky-500/10" },
];

const commentaireObligatoire = (decision: DecisionRevue) => decision === "refusee" || decision === "modifications_demandees";

/** Formulaire de décision : rpc decider_soumission (la base vérifie rôle, statut et commentaire). */
const FormulaireDecision = ({ soumission, surDecision }: { soumission: Soumission; surDecision: (statut: StatutSoumission) => Promise<void> }) => {
  const { t } = useTranslation();
  const [decision, setDecision] = useState<DecisionRevue | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const decider = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    if (!decision) return setErreur("erreurs.decisionRequise");
    if (commentaireObligatoire(decision) && !commentaire.trim()) return setErreur("erreurs.commentaireObligatoire");
    if (commentaire.trim().length > LONGUEUR_MAX_COMMENTAIRE) return setErreur("erreurs.commentaireTropLong");
    setEnvoi(true);
    try {
      const statut = await deciderSoumission(soumission.id, decision, commentaire);
      setDecision(null);
      setCommentaire("");
      // Après une décision finale, ce formulaire disparaît : le message de confirmation est affiché par la page.
      await surDecision(statut);
    } catch (e) {
      setErreur(cleErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={decider} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("moderation.revue.decision")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {DECISIONS.map(({ valeur, icone: Icone, couleur }) => (
            <label key={valeur} className="relative cursor-pointer">
              <input
                type="radio"
                name="decision"
                value={valeur}
                checked={decision === valeur}
                onChange={() => setDecision(valeur)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-full items-start gap-3 rounded-xl border-2 border-gray-200 p-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 dark:border-white/10",
                  couleur
                )}
              >
                <Icone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{t(`moderation.revue.decisions.${valeur}.titre`)}</span>
                  <span className="block text-xs text-muted-foreground">{t(`moderation.revue.decisions.${valeur}.texte`)}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="commentaire">
            {t("moderation.revue.commentaire")}
            {decision && !commentaireObligatoire(decision) && (
              <span className="ms-1.5 text-xs font-normal text-muted-foreground">({t("propositions.champs.facultatif")})</span>
            )}
          </Label>
          <span className={cn("text-xs tabular-nums", commentaire.length > LONGUEUR_MAX_COMMENTAIRE ? "text-red-600" : "text-muted-foreground")}>
            {commentaire.length} / {LONGUEUR_MAX_COMMENTAIRE}
          </span>
        </div>
        <Textarea
          id="commentaire"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={4}
          maxLength={LONGUEUR_MAX_COMMENTAIRE}
          dir="auto"
          required={decision !== null && commentaireObligatoire(decision)}
          aria-describedby="aide-commentaire"
        />
        <p id="aide-commentaire" className="text-xs text-muted-foreground">
          {t("moderation.revue.commentaireAide")}
        </p>
      </div>

      {erreur && <MessageAuth type="erreur">{t(erreur)}</MessageAuth>}

      <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi}>
        {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("moderation.revue.valider")}
      </Button>
    </form>
  );
};

/** Admin : création de la donnée à partir de la proposition acceptée, par l'API (`/v1/admin/submissions/:id/publish`). */
const BoutonMiseEnLigne = ({ soumission, surMiseEnLigne }: { soumission: Soumission; surMiseEnLigne: () => Promise<void> }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [envoi, setEnvoi] = useState(false);

  const mettreEnLigne = async () => {
    setEnvoi(true);
    try {
      const resultat = await mettreEnLigneProposition(soumission.id);
      toast.success(t("moderation.revue.miseEnLigneFaite", { titre: texteTraduit(soumission.titre, langue) }));
      if (resultat.fichiers_ignores.length > 0) toast.warning(t("moderation.revue.fichiersIgnores", { noms: resultat.fichiers_ignores.join(", ") }));
      await surMiseEnLigne();
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : t("moderation.revue.miseEnLigneErreur"));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mt-3 space-y-1.5">
      <Button type="button" className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi} onClick={() => void mettreEnLigne()}>
        {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
        {t("moderation.revue.mettreEnLigne")}
      </Button>
      <p className="text-xs opacity-80">{t("moderation.revue.mettreEnLigneAide")}</p>
    </div>
  );
};

const RevueProposition = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { id = "" } = useParams();
  const { utilisateur, profil } = useAuth();
  const clientRequetes = useQueryClient();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [gestionFichiers, setGestionFichiers] = useState(false);
  const requete = useQuery({ queryKey: ["soumission", id], queryFn: () => chargerSoumission(id) });

  const apresDecision = async (statut: StatutSoumission) => {
    clientRequetes.invalidateQueries({ queryKey: ["moderation"] });
    clientRequetes.invalidateQueries({ queryKey: ["mes-soumissions"] });
    await requete.refetch();
    setConfirmation(t("moderation.revue.decisionEnregistree", { statut: t(`propositions.statuts.${statut}`) }));
  };

  const apresMiseEnLigne = async () => {
    for (const cle of ["moderation", "mes-soumissions", "catalogue", "fiche", "statistiques", "admin"]) clientRequetes.invalidateQueries({ queryKey: [cle] });
    await requete.refetch();
  };

  const apresModification = async () => {
    clientRequetes.invalidateQueries({ queryKey: ["moderation"] });
    clientRequetes.invalidateQueries({ queryKey: ["mes-soumissions"] });
    await requete.refetch();
  };

  const retour = (
    <Button asChild variant="ghost" size="sm" className="-ms-2 gap-1.5">
      <Link to={routes.moderation}>
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("moderation.titre")}
      </Link>
    </Button>
  );

  if (requete.isPending) {
    return (
      <MiseEnPage titre={t("propositions.detail.titre")} avant={retour} largeur="large">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </MiseEnPage>
    );
  }
  if (requete.isError) {
    return (
      <MiseEnPage titre={t("propositions.detail.titre")} avant={retour} largeur="large">
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      </MiseEnPage>
    );
  }
  const soumission = requete.data;
  if (!soumission) return <PropositionIntrouvable />;

  // Un modérateur ne valide pas sa propre proposition (un admin le peut) : la base le refuse aussi.
  const estSaPropreProposition = soumission.soumis_par === utilisateur?.id && profil?.role !== "admin";
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "long", timeStyle: "short" });
  // L'équipe complète les propositions des autres ; la sienne se modifie depuis « Mes propositions ».
  const peutModifier = estModifiable(soumission.statut) && soumission.soumis_par !== utilisateur?.id;
  const aCompleter = peutModifier ? champsVides(valeursDepuisSoumission(soumission)) : [];
  const journaliserFichiers = (action: "ajout" | "suppression", noms: string[]) =>
    noterModification(soumission.id, t(action === "ajout" ? "moderation.revue.journalAjout" : "moderation.revue.journalSuppression", { noms: noms.join(", ") }));

  return (
    <MiseEnPage
      titre={texteTraduit(soumission.titre, langue) || t("propositions.detail.titre")}
      sousTitre={t("propositions.envoyeeLe", { date: formatDate.format(new Date(soumission.cree_le)) })}
      chemin={routes.moderationProposition(soumission.id)}
      avant={retour}
      largeur="large"
      actions={<BadgeStatut statut={soumission.statut} className="text-sm" />}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {soumission.statut === "acceptee" && (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100" role="status">
              <Rocket className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{t("propositions.enAttenteMiseEnLigne")}</p>
                <p className="mt-0.5 opacity-90">{t("moderation.revue.aideAcceptee")}</p>
                {profil?.role === "admin" && <BoutonMiseEnLigne soumission={soumission} surMiseEnLigne={apresMiseEnLigne} />}
              </div>
            </div>
          )}
          {soumission.statut === "publiee" && soumission.dataset_publie && (
            <Button asChild className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
              <Link to={routes.donnee(soumission.dataset_publie.slug)}>{t("propositions.detail.voirDonneePubliee")}</Link>
            </Button>
          )}

          {aCompleter.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <ClipboardList className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{t("moderation.revue.aCompleter", { count: aCompleter.length })}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {aCompleter.map((champ) => (
                    <li key={champ} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium dark:bg-amber-500/20">
                      {t(`propositions.champs.${champ}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <Carte titre={t("propositions.detail.contenu")}>
            <ContenuProposition soumission={soumission} modifiable={peutModifier} surEnregistrement={apresModification} moderation />
          </Carte>

          <Carte titre={t("propositions.champs.fichiers")}>
            <div className="space-y-4">
              {gestionFichiers && peutModifier ? (
                <GestionFichiers
                  idAuteur={soumission.soumis_par}
                  soumissionId={soumission.id}
                  fichiers={soumission.fichiers}
                  modifiable
                  surChangement={() => void apresModification()}
                  journaliser={journaliserFichiers}
                />
              ) : (
                <FichiersRevue fichiers={soumission.fichiers} />
              )}
              {peutModifier && (
                <Button type="button" variant="outline" className="gap-2" onClick={() => setGestionFichiers((actif) => !actif)}>
                  <FolderCog className="h-4 w-4" />
                  {t(gestionFichiers ? "moderation.revue.retourApercu" : "moderation.revue.gererFichiers")}
                </Button>
              )}
            </div>
          </Carte>
        </div>

        <aside className="space-y-6">
          {soumission.auteur && (
            <Carte titre={t("moderation.revue.auteur")}>
              <Link to={routes.membre(soumission.auteur.pseudo)} className="flex items-center gap-3 hover:underline">
                <AvatarMembre profil={soumission.auteur} className="h-11 w-11" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{soumission.auteur.nom_affiche || soumission.auteur.pseudo}</span>
                  <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                    @{soumission.auteur.pseudo}
                  </span>
                </span>
              </Link>
            </Carte>
          )}

          <Carte titre={t("moderation.revue.decider")} className="space-y-4">
            {confirmation && <MessageAuth type="succes">{confirmation}</MessageAuth>}
            {!estModifiable(soumission.statut) ? (
              <p className="text-sm text-muted-foreground">{t("moderation.revue.dejaTraitee")}</p>
            ) : estSaPropreProposition ? (
              <MessageAuth type="erreur">{t("erreurs.propreProposition")}</MessageAuth>
            ) : (
              <FormulaireDecision soumission={soumission} surDecision={apresDecision} />
            )}
          </Carte>

          <Carte titre={t("propositions.detail.historique")}>
            <HistoriqueRevues revues={soumission.revues} />
          </Carte>
        </aside>
      </div>
    </MiseEnPage>
  );
};

export default RevueProposition;
