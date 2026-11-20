import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BoutonsConnexionSociale } from "@/components/auth/BoutonsConnexionSociale";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { avecSuite, routes } from "@/lib/routes";

interface ConnexionTelechargementProps {
  /** Page où revenir après la connexion (la fiche, qui rouvre le dialogue sur le fichier choisi). */
  suite: string;
}

/**
 * Étape de connexion du dialogue de téléchargement, pour un visiteur : le fennec, la connexion rapide
 * (Google, puis Facebook / GitHub si activés) et « Autre mode de connexion » vers /login. Après la connexion,
 * le visiteur revient sur la fiche avec le dialogue rouvert, prêt à choisir le fichier et le format.
 */
export function ConnexionTelechargement({ suite }: ConnexionTelechargementProps) {
  const { t } = useTranslation();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-sm space-y-5 py-2 text-center">
      <img src="/mascotte/fennec.webp" alt="" aria-hidden width={241} height={332} className="mx-auto h-28 w-auto drop-shadow-md" />
      <DialogHeader className="space-y-2 sm:text-center">
        <DialogTitle className="text-xl">{t("telechargement.connexion.titre")}</DialogTitle>
        <DialogDescription>{t("telechargement.connexion.description")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 text-start">
        <BoutonsConnexionSociale suite={suite} surErreur={(cle) => setErreur(t(cle))} />
        <Button asChild variant="ghost" className="h-11 w-full gap-2 text-muted-foreground hover:text-foreground">
          <Link to={avecSuite(routes.connexion, suite)}>
            <Mail className="h-4 w-4" aria-hidden />
            {t("telechargement.connexion.autreMode")}
          </Link>
        </Button>
      </div>

      {erreur && (
        <p role="alert" className="text-sm text-destructive">
          {erreur}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("telechargement.connexion.gratuit")}</p>
    </div>
  );
}
