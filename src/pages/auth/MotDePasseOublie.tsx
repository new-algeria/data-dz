import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CadreAuth } from "@/components/auth/CadreAuth";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { envoyerLienReinitialisation } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";
import { routes } from "@/lib/routes";

const MotDePasseOublie = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    if (!email.trim()) return setErreur("erreurs.emailRequis");
    setEnvoi(true);
    try {
      await envoyerLienReinitialisation(email.trim());
      setEnvoye(true);
    } catch (e) {
      setErreur(cleErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <CadreAuth
      titre={t("auth.oubliTitre")}
      sousTitre={t("auth.oubliSousTitre")}
      pied={
        <Link to={routes.connexion} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
          {t("auth.retourConnexion")}
        </Link>
      }
    >
      {envoye ? (
        // Même message qu'un compte existe ou non : on ne révèle pas quels emails sont inscrits.
        <MessageAuth type="email">{t("auth.oubliEnvoye", { email: email.trim() })}</MessageAuth>
      ) : (
        <form onSubmit={valider} className="space-y-4" noValidate>
          {erreur && <MessageAuth type="erreur">{t(erreur)}</MessageAuth>}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailExemple")}
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi}>
            {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.oubliBouton")}
          </Button>
        </form>
      )}
    </CadreAuth>
  );
};

export default MotDePasseOublie;
