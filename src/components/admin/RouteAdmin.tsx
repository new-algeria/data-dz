import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MiseEnPage } from "@/components/MiseEnPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexte/ContexteAuth";
import { usePermissions } from "@/hooks/use-roles";
import type { Permission } from "@/lib/roles";
import { routes } from "@/lib/routes";

/**
 * Réservé aux administrateurs, ou aux membres dont le rôle porte `permission` (à placer dans une RouteProtegee).
 * Simple confort d'affichage : la base (rpc, RLS) et l'API refusent de toute façon les autres.
 */
export const RouteAdmin = ({ children, permission }: { children: ReactNode; permission?: Permission }) => {
  const { t } = useTranslation();
  const { chargementProfil } = useAuth();
  const { admin, chargement, a } = usePermissions();

  if (chargementProfil || chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("moderation.verification")}
      </div>
    );
  }

  if (!admin && !(permission && a(permission))) {
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
