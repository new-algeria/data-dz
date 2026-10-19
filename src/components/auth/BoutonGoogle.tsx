import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chargerFournisseursActifs, connecterAvecGoogle } from "@/lib/auth";
import { cleErreur } from "@/lib/erreurs";

/** Logo « G » officiel, requis par les règles d'affichage de Google Sign-In. */
const LogoGoogle = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.11Z" />
    <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.86 8.88 4.75 12 4.75Z" />
  </svg>
);

interface BoutonGoogleProps {
  suite: string;
  surErreur: (cle: string) => void;
}

export const BoutonGoogle = ({ suite, surErreur }: BoutonGoogleProps) => {
  const { t } = useTranslation();
  const [redirection, setRedirection] = useState(false);
  // Le bouton est toujours affiché ; il est désactivé tant que Google n'est pas activé dans Supabase.
  const { data: fournisseurs } = useQuery({
    queryKey: ["fournisseurs-auth"],
    queryFn: chargerFournisseursActifs,
    staleTime: 10 * 60 * 1000,
  });
  const indisponible = fournisseurs !== undefined && !fournisseurs.google;

  const continuer = async () => {
    setRedirection(true);
    try {
      await connecterAvecGoogle(suite);
    } catch (erreur) {
      setRedirection(false);
      surErreur(cleErreur(erreur));
    }
  };

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" className="w-full gap-2.5" onClick={continuer} disabled={redirection || indisponible}>
        {redirection ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogoGoogle />}
        {t("auth.continuerGoogle")}
      </Button>
      {indisponible && <p className="text-center text-xs text-muted-foreground">{t("auth.googleBientot")}</p>}
    </div>
  );
};
