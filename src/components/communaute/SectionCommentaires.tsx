import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { AvatarMembre } from "@/components/AvatarMembre";
import { EtatErreur } from "@/components/EtatErreur";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { useEstModerateur } from "@/hooks/use-moderateur";
import {
  chargerCommentaires,
  compterVisibles,
  construireFils,
  LONGUEUR_MAX_COMMENTAIRE,
  masquerCommentaire,
  modifierCommentaire,
  publierCommentaire,
  supprimerCommentaire,
  type Commentaire,
} from "@/lib/commentaires";
import { dateComplete, ilYa } from "@/lib/dates";
import { cleErreur } from "@/lib/erreurs";
import { formaterNombre } from "@/lib/fichiers";
import { avecSuite, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Zone de saisie avec compteur (2 000 caractères maximum). */
const FormulaireCommentaire = ({
  id,
  valeurInitiale = "",
  libelle,
  libelleBouton,
  surEnvoi,
  surAnnulation,
  autoFocus,
}: {
  id: string;
  valeurInitiale?: string;
  libelle: string;
  libelleBouton: string;
  surEnvoi: (contenu: string) => Promise<void>;
  surAnnulation?: () => void;
  autoFocus?: boolean;
}) => {
  const { t } = useTranslation();
  const [contenu, setContenu] = useState(valeurInitiale);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const longueur = contenu.trim().length;
  const tropLong = contenu.length > LONGUEUR_MAX_COMMENTAIRE;

  const envoyer = async (evenement: FormEvent) => {
    evenement.preventDefault();
    if (!longueur || tropLong) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await surEnvoi(contenu);
      setContenu("");
    } catch (e) {
      setErreur(cleErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={envoyer} className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {libelle}
      </label>
      <Textarea
        id={id}
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        placeholder={libelle}
        rows={3}
        maxLength={LONGUEUR_MAX_COMMENTAIRE}
        dir="auto"
        autoFocus={autoFocus}
        className="bg-white dark:bg-gray-900"
      />
      {erreur && <MessageAuth type="erreur">{t(erreur)}</MessageAuth>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi || !longueur || tropLong}>
          {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
          {libelleBouton}
        </Button>
        {surAnnulation && (
          <Button type="button" size="sm" variant="ghost" onClick={surAnnulation} disabled={envoi}>
            {t("commentaires.annuler")}
          </Button>
        )}
        <span className={cn("ms-auto text-xs tabular-nums", tropLong ? "text-red-600" : "text-muted-foreground")}>
          {contenu.length} / {LONGUEUR_MAX_COMMENTAIRE}
        </span>
      </div>
    </form>
  );
};

const Action = ({ icone: Icone, children, onClick, danger }: { icone: typeof Reply; children: ReactNode; onClick: () => void; danger?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1 rounded px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
      danger && "hover:text-red-600 dark:hover:text-red-400"
    )}
  >
    <Icone className="h-3.5 w-3.5" aria-hidden />
    {children}
  </button>
);

interface ElementProps {
  commentaire: Commentaire;
  cible: string;
  moderateur: boolean;
  idUtilisateur: string | undefined;
  enEdition: boolean;
  surRepondre?: () => void;
  surModifier: () => void;
  surAnnulerEdition: () => void;
  surEnregistrer: (contenu: string) => Promise<void>;
  surSupprimer: () => void;
  surMasquer: (masquer: boolean) => void;
}

const ElementCommentaire = ({ commentaire: c, cible, moderateur, idUtilisateur, enEdition, ...actions }: ElementProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const ancre = `comment-${c.id}`;
  const estAuteur = Boolean(idUtilisateur) && c.auteur_id === idUtilisateur;
  const date = (
    <time dateTime={c.cree_le} title={dateComplete(c.cree_le, langue)} className="text-xs text-muted-foreground">
      {ilYa(c.cree_le, langue)}
    </time>
  );

  if (c.supprime) {
    return (
      <div id={ancre} className="scroll-mt-24 flex items-center gap-2 py-1 text-sm italic text-muted-foreground">
        <Trash2 className="h-4 w-4" aria-hidden />
        {t("commentaires.supprime")} · {date}
      </div>
    );
  }

  const nom = c.auteur ? c.auteur.nom_affiche || c.auteur.pseudo : t("commentaires.membreSupprime");
  return (
    <article
      id={ancre}
      aria-label={t("commentaires.par", { nom })}
      className={cn(
        "scroll-mt-24 flex gap-3 rounded-xl p-2 transition-colors",
        cible === ancre && "bg-emerald-50 ring-2 ring-emerald-500/60 dark:bg-emerald-500/10",
        c.masque && "bg-amber-50 dark:bg-amber-400/10"
      )}
    >
      {c.auteur ? (
        <Link to={routes.membre(c.auteur.pseudo)} className="shrink-0" tabIndex={-1} aria-hidden>
          <AvatarMembre profil={c.auteur} className="h-9 w-9 text-xs" />
        </Link>
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-white/10" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {c.auteur ? (
            <Link to={routes.membre(c.auteur.pseudo)} className="text-sm font-semibold hover:underline">
              {nom}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">{nom}</span>
          )}
          {c.auteur && (
            <span className="text-xs text-muted-foreground" dir="ltr">
              @{c.auteur.pseudo}
            </span>
          )}
          {date}
          {c.modifie_le && (
            <span className="text-xs text-muted-foreground" title={dateComplete(c.modifie_le, langue)}>
              · {t("commentaires.modifie")}
            </span>
          )}
          {c.masque && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
              <EyeOff className="h-3 w-3" aria-hidden />
              {t("commentaires.masque")}
            </span>
          )}
        </p>
        {c.masque && !moderateur && estAuteur && <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{t("commentaires.masqueAuteur")}</p>}

        {enEdition ? (
          <div className="mt-2">
            <FormulaireCommentaire
              id={`edition-${c.id}`}
              valeurInitiale={c.contenu}
              libelle={t("commentaires.modifierLibelle")}
              libelleBouton={t("commentaires.enregistrer")}
              surEnvoi={actions.surEnregistrer}
              surAnnulation={actions.surAnnulerEdition}
              autoFocus
            />
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-800 dark:text-gray-200" dir="auto">
            {c.contenu}
          </p>
        )}

        {!enEdition && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {actions.surRepondre && (
              <Action icone={Reply} onClick={actions.surRepondre}>
                {t("commentaires.repondre")}
              </Action>
            )}
            {estAuteur && (
              <>
                <Action icone={Pencil} onClick={actions.surModifier}>
                  {t("commentaires.modifier")}
                </Action>
                <Action icone={Trash2} onClick={actions.surSupprimer} danger>
                  {t("commentaires.supprimer")}
                </Action>
              </>
            )}
            {moderateur && (
              <Action icone={c.masque ? Eye : EyeOff} onClick={() => actions.surMasquer(!c.masque)}>
                {c.masque ? t("commentaires.reafficher") : t("commentaires.masquer")}
              </Action>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

/** Section #comments de la fiche : fils chronologiques avec un niveau de réponses. */
export const SectionCommentaires = ({ datasetId, slug }: { datasetId: string; slug: string }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { utilisateur } = useAuth();
  const { data: moderateur = false } = useEstModerateur();
  const clientRequetes = useQueryClient();
  const emplacement = useLocation();
  const cible = emplacement.hash.slice(1);
  const [reponseA, setReponseA] = useState<string | null>(null);
  const [edition, setEdition] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<Commentaire | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  const cleRequete = ["commentaires", datasetId];
  const requete = useQuery({ queryKey: cleRequete, queryFn: () => chargerCommentaires(datasetId), staleTime: 30 * 1000 });

  // Lien direct vers un commentaire (notification de réponse) ou vers la section : défilement une fois la liste chargée.
  useEffect(() => {
    if (!requete.isSuccess || !(cible === "comments" || cible.startsWith("comment-"))) return;
    const element = document.getElementById(cible);
    element?.scrollIntoView({ behavior: "smooth", block: cible === "comments" ? "start" : "center" });
  }, [requete.isSuccess, cible]);

  const rafraichir = async () => {
    await clientRequetes.invalidateQueries({ queryKey: cleRequete });
    // Le compteur nb_commentaires de la fiche et du catalogue est recalculé par la base.
    clientRequetes.invalidateQueries({ queryKey: ["fiche", slug] });
    clientRequetes.invalidateQueries({ queryKey: ["catalogue"] });
  };

  const executer = async (action: () => Promise<void>) => {
    setErreurAction(null);
    try {
      await action();
      await rafraichir();
    } catch (e) {
      setErreurAction(cleErreur(e));
    }
  };

  const publier = async (contenu: string, parentId: string | null) => {
    await publierCommentaire(datasetId, contenu, parentId);
    setReponseA(null);
    await rafraichir();
  };

  const fils = requete.data ? construireFils(requete.data) : [];
  const nombre = requete.data ? compterVisibles(requete.data) : 0;

  const element = (c: Commentaire, surRepondre?: () => void) => (
    <ElementCommentaire
      commentaire={c}
      cible={cible}
      moderateur={moderateur}
      idUtilisateur={utilisateur?.id}
      enEdition={edition === c.id}
      surRepondre={utilisateur ? surRepondre : undefined}
      surModifier={() => setEdition(c.id)}
      surAnnulerEdition={() => setEdition(null)}
      surEnregistrer={async (contenu) => {
        await modifierCommentaire(c.id, contenu);
        setEdition(null);
        await rafraichir();
      }}
      surSupprimer={() => setASupprimer(c)}
      surMasquer={(masquer) => executer(() => masquerCommentaire(c.id, masquer))}
    />
  );

  return (
    <motion.section
      id="comments"
      aria-labelledby="titre-commentaires"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="scroll-mt-20 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-gray-800"
    >
      <h2 id="titre-commentaires" className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <MessageSquare className="h-4 w-4" aria-hidden />
        </span>
        {t("commentaires.titre")}
        {requete.isSuccess && (
          <span className="rounded-full bg-gray-100 px-2 text-sm font-medium tabular-nums text-muted-foreground dark:bg-white/10">
            {formaterNombre(nombre, langue)}
          </span>
        )}
      </h2>

      {utilisateur ? (
        <div className="mb-6">
          <FormulaireCommentaire
            id="nouveau-commentaire"
            libelle={t("commentaires.ecrire")}
            libelleBouton={t("commentaires.publier")}
            surEnvoi={(contenu) => publier(contenu, null)}
          />
        </div>
      ) : (
        <p className="mb-6 rounded-xl bg-gray-50 p-3 text-sm text-muted-foreground dark:bg-white/5">
          <Link to={avecSuite(routes.connexion, `${routes.donnee(slug)}#comments`)} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            {t("commentaires.seConnecter")}
          </Link>{" "}
          {t("commentaires.pourParticiper")}
        </p>
      )}

      {erreurAction && (
        <div className="mb-4">
          <MessageAuth type="erreur">{t(erreurAction)}</MessageAuth>
        </div>
      )}

      {requete.isPending ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : requete.isError ? (
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      ) : fils.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("commentaires.aucun")}</p>
      ) : (
        <ol className="space-y-4">
          {fils.map((fil) => {
            const parent = fil.commentaire;
            const cle = parent?.id ?? `orphelin-${fil.reponses[0].id}`;
            return (
              <li key={cle} className="space-y-2">
                {parent ? (
                  element(parent, parent.supprime || parent.masque ? undefined : () => setReponseA(reponseA === parent.id ? null : parent.id))
                ) : (
                  <p className="flex items-center gap-2 py-1 text-sm italic text-muted-foreground">
                    <EyeOff className="h-4 w-4" aria-hidden />
                    {t("commentaires.origineMasquee")}
                  </p>
                )}
                {(fil.reponses.length > 0 || reponseA === parent?.id) && (
                  <ol className="ms-6 space-y-2 border-s-2 border-gray-100 ps-4 dark:border-white/10">
                    {fil.reponses.map((reponse) => (
                      <li key={reponse.id}>{element(reponse)}</li>
                    ))}
                    {parent && reponseA === parent.id && (
                      <li>
                        <FormulaireCommentaire
                          id={`reponse-${parent.id}`}
                          libelle={t("commentaires.repondreA", { nom: parent.auteur?.nom_affiche || parent.auteur?.pseudo || "" })}
                          libelleBouton={t("commentaires.repondre")}
                          surEnvoi={(contenu) => publier(contenu, parent.id)}
                          surAnnulation={() => setReponseA(null)}
                          autoFocus
                        />
                      </li>
                    )}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <AlertDialog open={aSupprimer !== null} onOpenChange={(ouvert) => !ouvert && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("commentaires.supprimerTitre")}</AlertDialogTitle>
            <AlertDialogDescription>{t("commentaires.supprimerTexte")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("commentaires.annuler")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                const commentaire = aSupprimer;
                setASupprimer(null);
                if (commentaire) void executer(() => supprimerCommentaire(commentaire.id));
              }}
            >
              {t("commentaires.supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.section>
  );
};
