import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { estErreurChargementModule, rechargerApresDeploiement } from "@/lib/rechargement";

const PageEnErreur = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center p-4" role="alert">
      <div className="max-w-md space-y-4 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
        <h1 className="text-lg font-semibold">{t("erreurs.pageTitre")}</h1>
        <p className="text-sm text-muted-foreground">{t("erreurs.pageTexte")}</p>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RotateCw className="h-4 w-4" />
          {t("erreurs.recharger")}
        </Button>
      </div>
    </div>
  );
};

/** Dernier filet : une erreur d'affichage montre un message et un bouton « Recharger » au lieu d'une page blanche. */
export class LimiteErreur extends Component<{ children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };

  static getDerivedStateFromError() {
    return { erreur: true };
  }

  componentDidCatch(erreur: unknown, infos: ErrorInfo) {
    // Fichier d'une ancienne version (nouveau déploiement) : un rechargement suffit.
    if (estErreurChargementModule(erreur) && rechargerApresDeploiement()) return;
    console.error(erreur, infos.componentStack);
  }

  render() {
    return this.state.erreur ? <PageEnErreur /> : this.props.children;
  }
}
