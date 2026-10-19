import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexte/ContexteAuth";

/** Réservé aux membres connectés : sinon redirige vers /connexion en mémorisant la page demandée. */
export const RouteProtegee = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const { session, chargement } = useAuth();
  const emplacement = useLocation();

  if (chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("auth.verificationSession")}
      </div>
    );
  }

  if (!session) {
    const suite = `${emplacement.pathname}${emplacement.search}`;
    return <Navigate to={`/connexion?suite=${encodeURIComponent(suite)}`} replace />;
  }

  return <>{children}</>;
};
