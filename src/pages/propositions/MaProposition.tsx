import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, Loader2, Send, Undo2 } from "lucide-react";
import { MiseEnPage, Carte } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { BadgeStatut, ExplicationStatut } from "@/components/propositions/BadgeStatut";
import { ContenuProposition } from "@/components/propositions/ContenuProposition";
import { GestionFichiers } from "@/components/propositions/GestionFichiers";
import { HistoriqueRevues } from "@/components/propositions/HistoriqueRevues";
import { PropositionIntrouvable } from "@/components/propositions/PropositionIntrouvable";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { cleErreur } from "@/lib/erreurs";
import { localeNombres } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import {
  chargerSoumission,
  estModifiable,
  renvoyerSoumission,
  retirerSoumission,
} from "@/lib/soumissions";
import { texteTraduit } from "@/lib/traduction";

type Message = { type: "erreur" | "succes"; texte: string };

const MaProposition = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { id = "" } = useParams();
  const { utilisateur } = useAuth();
  const clientRequetes = useQueryClient();
  const [action, setAction] = useState<"renvoi" | "retrait" | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const requete = useQuery({ queryKey: ["soumission", id], queryFn: () => chargerSoumission(id) });

  const rafraichir = async () => {
    clientRequetes.invalidateQueries({ queryKey: ["mes-soumissions"] });
    clientRequetes.invalidateQueries({ queryKey: ["nb-soumissions-en-cours"] });
    clientRequetes.invalidateQueries({ queryKey: ["moderation"] });
    await requete.refetch();
  };

  const executer = async (type: "renvoi" | "retrait") => {
    setAction(type);
    setMessage(null);
    try {
      await (type === "renvoi" ? renvoyerSoumission(id) : retirerSoumission(id));
      await rafraichir();
      setMessage({ type: "succes", texte: t(type === "renvoi" ? "propositions.detail.renvoyee" : "propositions.detail.retiree") });
    } catch (e) {
      setMessage({ type: "erreur", texte: t(cleErreur(e)) });
    } finally {
      setAction(null);
    }
  };

  const retour = (
    <Button asChild variant="ghost" size="sm" className="-ms-2 gap-1.5">
      <Link to={routes.mesPropositions}>
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("propositions.mesTitre")}
      </Link>
    </Button>
  );

  if (requete.isPending) {
    return (
      <MiseEnPage titre={t("propositions.detail.titre")} avant={retour}>
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </MiseEnPage>
    );
  }
  if (requete.isError) {
    return (
      <MiseEnPage titre={t("propositions.detail.titre")} avant={retour}>
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      </MiseEnPage>
    );
  }
  const soumission = requete.data;
  if (!soumission) return <PropositionIntrouvable />;

  const estAuteur = soumission.soumis_par === utilisateur?.id;
  const modifiable = estAuteur && estModifiable(soumission.statut);
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "long" });

  return (
    <MiseEnPage
      titre={texteTraduit(soumission.titre, langue) || t("propositions.detail.titre")}
      sousTitre={t("propositions.envoyeeLe", { date: formatDate.format(new Date(soumission.cree_le)) })}
      chemin={routes.maProposition(soumission.id)}
      avant={retour}
      actions={<BadgeStatut statut={soumission.statut} className="text-sm" />}
    >
      <div className="space-y-6">
        <ExplicationStatut statut={soumission.statut} />

        {soumission.statut === "publiee" && soumission.dataset_publie && (
          <Button asChild className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
            <Link to={routes.donnee(soumission.dataset_publie.slug)}>
              <ExternalLink className="h-4 w-4" />
              {t("propositions.detail.voirDonneePubliee")}
            </Link>
          </Button>
        )}

        {message && <MessageAuth type={message.type}>{message.texte}</MessageAuth>}

        {estAuteur && estModifiable(soumission.statut) && (
          <Carte className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              {soumission.statut === "modifications_demandees" ? t("propositions.detail.aideRenvoi") : t("propositions.detail.aideModification")}
            </p>
            {soumission.statut === "modifications_demandees" && (
              <Button type="button" className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => executer("renvoi")} disabled={action !== null}>
                {action === "renvoi" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
                {t("propositions.detail.renvoyer")}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="gap-2 text-red-700 hover:text-red-800 dark:text-red-400" disabled={action !== null}>
                  {action === "retrait" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  {t("propositions.detail.retirer")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("propositions.detail.retirerTitre")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("propositions.detail.retirerTexte")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("propositions.detail.annuler")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => executer("retrait")} className="bg-red-600 text-white hover:bg-red-700">
                    {t("propositions.detail.retirer")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Carte>
        )}

        <Carte titre={t("propositions.detail.contenu")}>
          <ContenuProposition soumission={soumission} modifiable={modifiable} surEnregistrement={rafraichir} />
        </Carte>

        <Carte titre={t("propositions.champs.fichiers")}>
          {utilisateur && (
            <GestionFichiers
              idAuteur={soumission.soumis_par}
              soumissionId={soumission.id}
              fichiers={soumission.fichiers}
              modifiable={modifiable}
              surChangement={() => void rafraichir()}
            />
          )}
        </Carte>

        <Carte titre={t("propositions.detail.historique")}>
          <HistoriqueRevues revues={soumission.revues} />
        </Carte>
      </div>
    </MiseEnPage>
  );
};

export default MaProposition;
