import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronDown, Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CadreAuth } from "@/components/auth/CadreAuth";
import { ChampMotDePasse } from "@/components/auth/ChampMotDePasse";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { BoutonsConnexionSociale } from "@/components/auth/BoutonsConnexionSociale";
import { AccordConditions } from "@/components/legal/AccordConditions";
import { useAuth } from "@/contexte/ContexteAuth";
import { useSuite } from "@/hooks/use-suite";
import { connecterParMotDePasse, envoyerLienMagique, renvoyerConfirmation } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";
import { avecSuite, routes } from "@/lib/routes";

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
  /** Le formulaire email reste replié sous les boutons rapides (Google…) tant qu'on ne le demande pas. */
  const [emailOuvert, setEmailOuvert] = useState(false);

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
          <Link to={avecSuite(routes.inscription, suite)} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
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

        <BoutonsConnexionSociale suite={suite} surErreur={setErreur} />

        {/* Sous le « ou » : l'email prend moins de place que la connexion rapide, replié jusqu'au clic. */}
        {emailOuvert ? (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
            <form onSubmit={connecter} className="space-y-3" noValidate>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoFocus
                  autoComplete="email"
                  inputMode="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailExemple")}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mot-de-passe" className="text-xs">{t("auth.motDePasse")}</Label>
                  <Link to={routes.motDePasseOublie} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
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
              <Button type="submit" className="h-10 w-full bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi !== null || !email || !motDePasse}>
                {envoi === "motDePasse" && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.seConnecter")}
              </Button>
            </form>

            <Button type="button" variant="ghost" size="sm" className="h-9 w-full gap-2 text-muted-foreground" onClick={demanderLien} disabled={envoi !== null}>
              {envoi === "lien" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {t("auth.recevoirLien")}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEmailOuvert(true)}
            aria-expanded={false}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {t("auth.continuerAvecEmail")}
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        )}
        <AccordConditions />
      </div>
    </CadreAuth>
  );
};

export default Connexion;
