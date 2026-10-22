import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MiseEnPage } from "@/components/MiseEnPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexte/ContexteAuth";
import { routes } from "@/lib/routes";

/**
 * Réservé aux administrateurs (à placer dans une RouteProtegee), d'après le rôle du profil chargé.
 * Simple confort d'affichage : la fonction changer_role de la base refuse de toute façon les autres.
 */
export const RouteAdmin = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const { profil, chargementProfil } = useAuth();

  if (chargementProfil) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("moderation.verification")}
      </div>
    );
  }

  if (profil?.role !== "admin") {
    return (
      <MiseEnPage titre={t("moderation.accesReserveTitre")}>
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white px-4 py-14 text-center dark:bg-gray-800">
          <ShieldAlert className="h-10 w-10 text-amber-600" aria-hidden />
          <p className="max-w-md text-muted-foreground">{t("admin.accesReserve")}</p>
          <Button asChild variant="outline" className="mt-2">
            <Link to={routes.accueil}>{t("introuvable.retourAccueil")}</Link>
          </Button>
        </div>
      </MiseEnPage>
    );
  }

  return <>{children}</>;
};
