import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnexionSociale } from "@/hooks/use-connexion-sociale";
import { NOMS_FOURNISSEURS } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LogoFournisseur } from "./LogoFournisseur";

interface BoutonsConnexionSocialeProps {
  suite: string;
  surErreur: (cle: string) => void;
}

/**
 * Connexion rapide, en tête des formulaires : le premier fournisseur activé (Google, le plus utilisé) en grand bouton,
 * les autres (Facebook, GitHub) en boutons compacts côte à côte, puis le séparateur « ou ».
 * Seuls les fournisseurs activés dans Supabase (Authentication → Providers) apparaissent.
 */
export const BoutonsConnexionSociale = ({ suite, surErreur }: BoutonsConnexionSocialeProps) => {
  const { t } = useTranslation();
  const { fournisseurs, redirection, continuer } = useConnexionSociale(suite, surErreur);
  if (fournisseurs.length === 0) return null;
  const [principal, ...autres] = fournisseurs;

  return (
    <>
      <div className="space-y-2.5">
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full gap-3 text-base font-semibold shadow-sm"
          onClick={() => void continuer(principal)}
          disabled={redirection !== null}
        >
          {redirection === principal ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="[&>svg]:h-5 [&>svg]:w-5"><LogoFournisseur fournisseur={principal} /></span>}
          {t(`auth.continuerAvec.${principal}`)}
        </Button>
        {autres.length > 0 && (
          <div className={cn("grid gap-2.5", autres.length > 1 && "grid-cols-2")}>
            {autres.map((fournisseur) => (
              <Button
                key={fournisseur}
                type="button"
                variant="outline"
                className="h-11 gap-2"
                onClick={() => void continuer(fournisseur)}
                disabled={redirection !== null}
                aria-label={t(`auth.continuerAvec.${fournisseur}`)}
              >
                {redirection === fournisseur ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogoFournisseur fournisseur={fournisseur} />}
                {NOMS_FOURNISSEURS[fournisseur]}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("auth.ou")}
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
};
