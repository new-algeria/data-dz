import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { CadreAuth } from "@/components/auth/CadreAuth";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { lireErreurUrl, suiteSure } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";
import { estEnRecuperationMotDePasse, supabase } from "@/lib/supabase";
import { ANCIEN_PARAMETRE_SUITE, PARAMETRE_SUITE, routes } from "@/lib/routes";

/**
 * Page de retour des liens email (confirmation, lien magique) et de Google.
 * Finalise la session puis renvoie vers la page d'origine (?next=).
 */
const RetourAuth = () => {
  const { t } = useTranslation();
  const naviguer = useNavigate();
  const dejaTraite = useRef(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    // En mode strict, React exécute l'effet deux fois en développement : un lien ne s'utilise qu'une fois.
    if (dejaTraite.current) return;
    dejaTraite.current = true;

    const finaliser = async () => {
      const parametres = new URLSearchParams(window.location.search);
      const suite = suiteSure(parametres.get(PARAMETRE_SUITE) ?? parametres.get(ANCIEN_PARAMETRE_SUITE));

      const erreurUrl = lireErreurUrl();
      if (erreurUrl) return setErreur(erreurUrl);

      // Variante « token_hash » des modèles d'email : fonctionne même si le lien est ouvert sur un autre appareil.
      const tokenHash = parametres.get("token_hash");
      const type = parametres.get("type") as EmailOtpType | null;
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) return setErreur(cleErreur(error));
        return naviguer(type === "recovery" ? routes.nouveauMotDePasse : suite, { replace: true });
      }

      // Flux PKCE : supabase-js a déjà échangé le ?code= à l'initialisation ; on attend son résultat.
      const { error } = await supabase.auth.initialize();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return naviguer(estEnRecuperationMotDePasse() ? routes.nouveauMotDePasse : suite, { replace: true });
      }
      setErreur(error ? cleErreur(error) : "erreurs.lienExpire");
    };
    finaliser();
  }, [naviguer]);

  if (!erreur) {
    return (
      <CadreAuth titre={t("auth.retourTitre")}>
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("auth.retourEnCours")}
        </p>
      </CadreAuth>
    );
  }

  return (
    <CadreAuth titre={t("auth.retourEchecTitre")}>
      <div className="space-y-4">
        <MessageAuth type="erreur">{t(erreur)}</MessageAuth>
        <Button asChild className="w-full bg-emerald-700 text-white hover:bg-emerald-800">
          <Link to={routes.connexion}>{t("auth.retourConnexion")}</Link>
        </Button>
      </div>
    </CadreAuth>
  );
};

export default RetourAuth;
