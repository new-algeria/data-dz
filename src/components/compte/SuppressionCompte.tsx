import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmationValide, SuppressionImpossible, supprimerMonCompte } from "@/lib/compte";
import { routes } from "@/lib/routes";
import { EMAIL_CONTACT } from "@/lib/contact";

/** « Supprimer mon compte » (carte Compte de /profile) : confirmation en tapant son pseudo. */
export const SuppressionCompte = ({ idUtilisateur, pseudo }: { idUtilisateur: string; pseudo: string }) => {
  const { t } = useTranslation();
  const naviguer = useNavigate();
  const clientRequetes = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const supprimer = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      await supprimerMonCompte(idUtilisateur);
      clientRequetes.clear();
      setOuvert(false);
      toast.success(t("compte.suppression.reussie"));
      naviguer(routes.accueil, { replace: true });
    } catch (probleme) {
      const raison = probleme instanceof SuppressionImpossible ? probleme.raison : "inconnue";
      setErreur(t(`compte.suppression.erreurs.${raison}`, { email: EMAIL_CONTACT }));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="mt-6 border-t border-dashed pt-5">
      <p className="text-sm font-semibold text-destructive">{t("compte.suppression.titre")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("compte.suppression.explication")}</p>
      <AlertDialog
        open={ouvert}
        onOpenChange={(valeur) => {
          if (enCours) return;
          setOuvert(valeur);
          setSaisie("");
          setErreur(null);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" className="mt-3 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("compte.suppression.bouton")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("compte.suppression.confirmationTitre")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-start">
              <span className="block">{t("compte.suppression.detail")}</span>
              <span className="block">{t("compte.suppression.irreversible")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="confirmation-suppression">{t("compte.suppression.tapePseudo", { pseudo })}</Label>
            <Input
              id="confirmation-suppression"
              value={saisie}
              onChange={(evenement) => setSaisie(evenement.target.value)}
              autoComplete="off"
              dir="ltr"
              className="text-base"
            />
            {erreur && <p className="text-sm text-destructive" role="alert">{erreur}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enCours}>{t("compte.suppression.annuler")}</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={enCours || !confirmationValide(saisie, pseudo)} onClick={supprimer} className="gap-2">
              {enCours && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t("compte.suppression.confirmer")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
