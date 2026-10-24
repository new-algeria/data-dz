import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
import { MessageAuth } from "@/components/auth/MessageAuth";
import { LigneFichier } from "./LigneFichier";
import { ZoneDepot } from "./ZoneDepot";
import { cleErreur, cleErreurFichier } from "@/lib/erreurs";
import {
  envoyerFichierSoumission,
  MESSAGE_PROBLEME_FICHIER,
  nomStocke,
  telechargerFichierPrive,
  supprimerFichierSoumission,
  verifierFichier,
  type FichierSoumission,
} from "@/lib/soumissions";

interface GestionFichiersProps {
  /** Auteur de la proposition : les fichiers sont rangés dans son dossier, même ajoutés par un modérateur. */
  idAuteur: string;
  soumissionId: string;
  fichiers: FichierSoumission[];
  modifiable: boolean;
  surChangement: () => void;
  /** Côté modération : trace chaque ajout ou suppression dans l'historique de la proposition. */
  journaliser?: (action: "ajout" | "suppression", noms: string[]) => Promise<void>;
}

/** Fichiers d'une proposition existante : téléchargement, ajout et suppression tant qu'elle est modifiable. */
export const GestionFichiers = ({ idAuteur, soumissionId, fichiers, modifiable, surChangement, journaliser }: GestionFichiersProps) => {
  const { t } = useTranslation();
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<FichierSoumission | null>(null);
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; texte: string } | null>(null);

  const ajouter = async (nouveaux: File[]) => {
    setMessage(null);
    const noms = fichiers.map((fichier) => nomStocke(fichier.chemin_stockage));
    const erreurs: string[] = [];
    const ajoutes: string[] = [];
    for (const fichier of nouveaux) {
      const probleme = verifierFichier(fichier);
      if (probleme) {
        erreurs.push(`${fichier.name} : ${t(MESSAGE_PROBLEME_FICHIER[probleme])}`);
        continue;
      }
      setEnvoiEnCours(fichier.name);
      try {
        const envoye = await envoyerFichierSoumission(idAuteur, soumissionId, fichier, noms);
        noms.push(nomStocke(envoye.chemin_stockage));
        ajoutes.push(nomStocke(envoye.chemin_stockage));
      } catch (e) {
        erreurs.push(`${fichier.name} : ${t(cleErreurFichier(e))}`);
      }
    }
    setEnvoiEnCours(null);
    if (journaliser && ajoutes.length > 0) {
      try {
        await journaliser("ajout", ajoutes);
      } catch (e) {
        erreurs.push(t(cleErreur(e)));
      }
    }
    surChangement();
    setMessage(erreurs.length ? { type: "erreur", texte: erreurs.join("\n") } : { type: "succes", texte: t("propositions.detail.fichiersAjoutes") });
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setMessage(null);
    try {
      await supprimerFichierSoumission(aSupprimer);
    } catch (e) {
      setMessage({ type: "erreur", texte: t(cleErreurFichier(e)) });
      setASupprimer(null);
      return;
    }
    let message: { type: "erreur" | "succes"; texte: string } = { type: "succes", texte: t("propositions.detail.fichierSupprime") };
    try {
      await journaliser?.("suppression", [nomStocke(aSupprimer.chemin_stockage)]);
    } catch (e) {
      message = { type: "erreur", texte: t(cleErreur(e)) };
    }
    setMessage(message);
    setASupprimer(null);
    surChangement();
  };

  const telecharger = async (fichier: FichierSoumission) => {
    try {
      await telechargerFichierPrive(fichier.chemin_stockage);
    } catch (e) {
      setMessage({ type: "erreur", texte: t(cleErreurFichier(e)) });
    }
  };

  return (
    <div className="space-y-4">
      {fichiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("propositions.detail.aucunFichier")}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">
          {fichiers.map((fichier) => (
            <LigneFichier
              key={fichier.id}
              nom={nomStocke(fichier.chemin_stockage)}
              taille={fichier.taille_octets}
              actions={
                <>
                  <Button type="button" size="icon" variant="ghost" onClick={() => telecharger(fichier)} aria-label={t("propositions.detail.telecharger", { nom: fichier.nom_original })}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {modifiable && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => setASupprimer(fichier)}
                      aria-label={t("propositions.detail.supprimerFichier", { nom: fichier.nom_original })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}

      {envoiEnCours && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("propositions.envoiFichier", { nom: envoiEnCours })}
        </p>
      )}
      {message && (
        <MessageAuth type={message.type}>
          <span className="whitespace-pre-line">{message.texte}</span>
        </MessageAuth>
      )}
      {modifiable && <ZoneDepot surFichiers={ajouter} desactive={envoiEnCours !== null} />}

      <AlertDialog open={aSupprimer !== null} onOpenChange={(ouvert) => !ouvert && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("propositions.detail.supprimerFichierTitre")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("propositions.detail.supprimerFichierTexte", { nom: aSupprimer?.nom_original ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("propositions.detail.annuler")}</AlertDialogCancel>
            <AlertDialogAction onClick={supprimer} className="bg-red-600 text-white hover:bg-red-700">
              {t("propositions.detail.supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
