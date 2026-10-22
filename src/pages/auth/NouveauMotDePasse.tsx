import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CadreAuth } from "@/components/auth/CadreAuth";
import { ChampMotDePasse } from "@/components/auth/ChampMotDePasse";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { useAuth } from "@/contexte/ContexteAuth";
import { changerMotDePasse, lireErreurUrl, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";
import { supabase } from "@/lib/supabase";
import { routes } from "@/lib/routes";

/**
 * Arrivée depuis le lien « mot de passe oublié » : supabase-js échange le ?code= au chargement et émet
 * PASSWORD_RECOVERY (suivi par le contexte). Un membre déjà connecté peut aussi changer son mot de passe ici.
 */
const NouveauMotDePasse = () => {
  const { t } = useTranslation();
  const { session, chargement, terminerRecuperation } = useAuth();
  const naviguer = useNavigate();
  const dejaTraite = useRef(false);

  const [verification, setVerification] = useState(true);
  const [erreurLien, setErreurLien] = useState<string | null>(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    if (dejaTraite.current) return;
    dejaTraite.current = true;

    const verifierLien = async () => {
      const parametres = new URLSearchParams(window.location.search);
      const erreurUrl = lireErreurUrl();
      const tokenHash = parametres.get("token_hash");

      if (erreurUrl) {
        setErreurLien(erreurUrl);
      } else if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (parametres.get("type") ?? "recovery") as EmailOtpType,
        });
        if (error) setErreurLien(cleErreur(error));
      } else {
        const { error } = await supabase.auth.initialize();
        if (error) setErreurLien(cleErreur(error));
      }
      // Retire ?code= / ?token_hash= de la barre d'adresse.
      if (window.location.search || window.location.hash) naviguer(routes.nouveauMotDePasse, { replace: true });
      setVerification(false);
    };
    verifierLien();
  }, [naviguer]);

  const valider = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) return setErreur("erreurs.motDePasseTropCourt");
    if (motDePasse !== confirmation) return setErreur("erreurs.motsDePasseDifferents");
    setEnvoi(true);
    try {
      await changerMotDePasse(motDePasse);
      terminerRecuperation();
      setTermine(true);
      setTimeout(() => naviguer(routes.profil, { replace: true }), 1500);
    } catch (e) {
      setErreur(cleErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  if (verification || chargement) {
    return (
      <CadreAuth titre={t("auth.nouveauTitre")}>
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("auth.verificationLien")}
        </p>
      </CadreAuth>
    );
  }

  if (!session) {
    return (
      <CadreAuth titre={t("auth.nouveauTitre")}>
        <div className="space-y-4">
          <MessageAuth type="erreur">{t(erreurLien ?? "erreurs.lienExpire")}</MessageAuth>
          <Button asChild className="w-full bg-emerald-700 text-white hover:bg-emerald-800">
            <Link to={routes.motDePasseOublie}>{t("auth.redemanderLien")}</Link>
          </Button>
        </div>
      </CadreAuth>
    );
  }

  return (
    <CadreAuth titre={t("auth.nouveauTitre")} sousTitre={t("auth.nouveauSousTitre")}>
      {termine ? (
        <MessageAuth type="succes">{t("auth.motDePasseChange")}</MessageAuth>
      ) : (
        <form onSubmit={valider} className="space-y-4" noValidate>
          {erreur && <MessageAuth type="erreur">{t(erreur)}</MessageAuth>}
          <div className="space-y-1.5">
            <Label htmlFor="mot-de-passe">{t("auth.nouveauMotDePasse")}</Label>
            <ChampMotDePasse
              id="mot-de-passe"
              autoComplete="new-password"
              required
              minLength={LONGUEUR_MIN_MOT_DE_PASSE}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("auth.critereLongueur", { nombre: LONGUEUR_MIN_MOT_DE_PASSE })}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmation">{t("auth.confirmationMotDePasse")}</Label>
            <ChampMotDePasse
              id="confirmation"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi}>
            {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.enregistrerMotDePasse")}
          </Button>
        </form>
      )}
    </CadreAuth>
  );
};

export default NouveauMotDePasse;
