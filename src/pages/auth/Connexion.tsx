import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CadreAuth } from "@/components/auth/CadreAuth";
import { ChampMotDePasse } from "@/components/auth/ChampMotDePasse";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { BoutonGoogle } from "@/components/auth/BoutonGoogle";
import { useAuth } from "@/contexte/ContexteAuth";
import { useSuite } from "@/hooks/use-suite";
import { connecterParMotDePasse, envoyerLienMagique, renvoyerConfirmation } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";

type Envoi = "motDePasse" | "lien" | "confirmation" | null;

const Connexion = () => {
  const { t } = useTranslation();
  const { session, chargement } = useAuth();
  const suite = useSuite();
  const naviguer = useNavigate();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState<Envoi>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [information, setInformation] = useState<string | null>(null);

  if (!chargement && session) return <Navigate to={suite} replace />;

  const executer = async (type: Envoi, action: () => Promise<void>, messageSucces?: string) => {
    setEnvoi(type);
    setErreur(null);
    setInformation(null);
    try {
      await action();
      if (messageSucces) setInformation(messageSucces);
    } catch (e) {
      setErreur(cleErreur(e));
    } finally {
      setEnvoi(null);
    }
  };

  const connecter = (evenement: FormEvent) => {
    evenement.preventDefault();
    executer("motDePasse", async () => {
      await connecterParMotDePasse(email.trim(), motDePasse);
      naviguer(suite, { replace: true });
    });
  };

  const demanderLien = () => {
    if (!email.trim()) {
      setErreur("erreurs.emailRequis");
      return;
    }
    executer("lien", () => envoyerLienMagique(email.trim(), suite), "auth.lienEnvoye");
  };

  const renvoyer = () => executer("confirmation", () => renvoyerConfirmation(email.trim(), suite), "auth.confirmationRenvoyee");

  return (
    <CadreAuth
      titre={t("auth.connexionTitre")}
      sousTitre={t("auth.connexionSousTitre")}
      pied={
        <>
          {t("auth.pasDeCompte")}{" "}
          <Link to={`/inscription?suite=${encodeURIComponent(suite)}`} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            {t("auth.creerCompte")}
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {erreur && (
          <MessageAuth type="erreur">
            {t(erreur)}
            {erreur === "erreurs.emailNonConfirme" && (
              <button type="button" onClick={renvoyer} className="ms-1 font-semibold underline" disabled={envoi !== null}>
                {t("auth.renvoyerConfirmation")}
              </button>
            )}
          </MessageAuth>
        )}
        {information && (
          <MessageAuth type="email">
            {t(information, { email: email.trim() })}
          </MessageAuth>
        )}

        <BoutonGoogle suite={suite} surErreur={setErreur} />

        <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("auth.ou")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={connecter} className="space-y-4" noValidate>
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="mot-de-passe">{t("auth.motDePasse")}</Label>
              <Link to="/mot-de-passe-oublie" className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                {t("auth.motDePasseOublieLien")}
              </Link>
            </div>
            <ChampMotDePasse
              id="mot-de-passe"
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi !== null || !email || !motDePasse}>
            {envoi === "motDePasse" && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.seConnecter")}
          </Button>
        </form>

        <Button type="button" variant="ghost" className="w-full gap-2" onClick={demanderLien} disabled={envoi !== null}>
          {envoi === "lien" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {t("auth.recevoirLien")}
        </Button>
      </div>
    </CadreAuth>
  );
};

export default Connexion;
