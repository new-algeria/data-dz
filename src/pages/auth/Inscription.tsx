import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CadreAuth } from "@/components/auth/CadreAuth";
import { ChampMotDePasse } from "@/components/auth/ChampMotDePasse";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { BoutonGoogle } from "@/components/auth/BoutonGoogle";
import { AccordConditions } from "@/components/legal/AccordConditions";
import { useAuth } from "@/contexte/ContexteAuth";
import { useSuite } from "@/hooks/use-suite";
import { inscrire, LONGUEUR_MIN_MOT_DE_PASSE, renvoyerConfirmation } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";
import { cn } from "@/lib/utils";

const Critere = ({ valide, children }: { valide: boolean; children: string }) => (
  <li className={cn("flex items-center gap-1.5", valide ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
    {valide ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
    {children}
  </li>
);

const Inscription = () => {
  const { t } = useTranslation();
  const { session, chargement } = useAuth();
  // Après confirmation de l'email, un nouveau membre arrive sur son profil pour le personnaliser.
  const suite = useSuite("/profil");
  const naviguer = useNavigate();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [emailEnvoye, setEmailEnvoye] = useState(false);
  const [renvoye, setRenvoye] = useState(false);

  if (!chargement && session) return <Navigate to={suite} replace />;

  const longueurOk = motDePasse.length >= LONGUEUR_MIN_MOT_DE_PASSE;
  const identiques = motDePasse.length > 0 && motDePasse === confirmation;

  const valider = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    if (!email.trim()) return setErreur("erreurs.emailRequis");
    if (!longueurOk) return setErreur("erreurs.motDePasseTropCourt");
    if (!identiques) return setErreur("erreurs.motsDePasseDifferents");

    setEnvoi(true);
    try {
      const resultat = await inscrire(email.trim(), motDePasse, suite);
      if (resultat.compteExistant) {
        setErreur("erreurs.compteExistant");
      } else if (resultat.session) {
        // Confirmation d'email désactivée : la session est ouverte tout de suite.
        naviguer(suite, { replace: true });
      } else {
        setEmailEnvoye(true);
      }
    } catch (e) {
      setErreur(cleErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  const renvoyer = async () => {
    setErreur(null);
    try {
      await renvoyerConfirmation(email.trim(), suite);
      setRenvoye(true);
    } catch (e) {
      setErreur(cleErreur(e));
    }
  };

  if (emailEnvoye) {
    return (
      <CadreAuth titre={t("auth.verifiezBoiteTitre")} sousTitre={t("auth.verifiezBoiteTexte", { email: email.trim() })}>
        <div className="space-y-4">
          {erreur && <MessageAuth type="erreur">{t(erreur)}</MessageAuth>}
          <MessageAuth type="email">{t("auth.verifiezBoiteAide")}</MessageAuth>
          {renvoye && <MessageAuth type="succes">{t("auth.confirmationRenvoyee", { email: email.trim() })}</MessageAuth>}
          <Button type="button" variant="outline" className="w-full" onClick={renvoyer}>
            {t("auth.renvoyerConfirmation")}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to={`/connexion?suite=${encodeURIComponent(suite)}`}>{t("auth.allerConnexion")}</Link>
          </Button>
        </div>
      </CadreAuth>
    );
  }

  return (
    <CadreAuth
      titre={t("auth.inscriptionTitre")}
      sousTitre={t("auth.inscriptionSousTitre")}
      pied={
        <>
          {t("auth.dejaInscrit")}{" "}
          <Link to={`/connexion?suite=${encodeURIComponent(suite)}`} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            {t("auth.seConnecter")}
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {erreur && (
          <MessageAuth type="erreur">
            {t(erreur)}
            {erreur === "erreurs.compteExistant" && (
              <Link to={`/connexion?suite=${encodeURIComponent(suite)}`} className="ms-1 font-semibold underline">
                {t("auth.seConnecter")}
              </Link>
            )}
          </MessageAuth>
        )}

        <BoutonGoogle suite={suite} surErreur={setErreur} />

        <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("auth.ou")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={valider} className="space-y-4" noValidate>
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
            <Label htmlFor="mot-de-passe">{t("auth.motDePasse")}</Label>
            <ChampMotDePasse
              id="mot-de-passe"
              autoComplete="new-password"
              required
              minLength={LONGUEUR_MIN_MOT_DE_PASSE}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              aria-describedby="criteres-mot-de-passe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmation">{t("auth.confirmationMotDePasse")}</Label>
            <ChampMotDePasse
              id="confirmation"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              aria-describedby="criteres-mot-de-passe"
            />
          </div>
          <ul id="criteres-mot-de-passe" className="space-y-1 text-xs">
            <Critere valide={longueurOk}>{t("auth.critereLongueur", { nombre: LONGUEUR_MIN_MOT_DE_PASSE })}</Critere>
            <Critere valide={identiques}>{t("auth.critereIdentiques")}</Critere>
          </ul>
          <Button type="submit" className="w-full bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi}>
            {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.creerCompte")}
          </Button>
          <AccordConditions />
        </form>
      </div>
    </CadreAuth>
  );
};

export default Inscription;
