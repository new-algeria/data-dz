import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { Button } from "@/components/ui/button";
import { useEstModerateur } from "@/hooks/use-moderateur";
import { cleErreur } from "@/lib/erreurs";
import { routes } from "@/lib/routes";

/**
 * Réservé aux modérateurs et admins (à placer dans une RouteProtegee).
 * Ce n'est qu'un confort d'affichage : la RLS et les fonctions de la base refusent de toute façon les autres.
 */
export const RouteModerateur = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const requete = useEstModerateur();

  if (requete.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("moderation.verification")}
      </div>
    );
  }

  if (requete.isError) {
    return (
      <MiseEnPage titre={t("moderation.titre")}>
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      </MiseEnPage>
    );
  }

  if (!requete.data) {
    return (
      <MiseEnPage titre={t("moderation.accesReserveTitre")}>
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white px-4 py-14 text-center dark:bg-gray-800">
          <ShieldAlert className="h-10 w-10 text-amber-600" aria-hidden />
          <p className="max-w-md text-muted-foreground">{t("moderation.accesReserveTexte")}</p>
          <Button asChild variant="outline" className="mt-2">
            <Link to={routes.accueil}>{t("introuvable.retourAccueil")}</Link>
          </Button>
        </div>
      </MiseEnPage>
    );
  }

  return <>{children}</>;
};
