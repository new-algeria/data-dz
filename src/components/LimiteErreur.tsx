import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { estErreurChargementModule, rechargerApresDeploiement } from "@/lib/rechargement";

const PageEnErreur = ({ erreur }: { erreur: unknown }) => {
  const { t } = useTranslation();
  const detail = erreur instanceof Error ? `${erreur.name}: ${erreur.message}` : String(erreur);
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
        {/* À copier dans un signalement : sans cela, l'erreur n'est visible que dans la console. */}
        <details className="text-start text-xs text-muted-foreground">
          <summary className="cursor-pointer text-center">{t("erreurs.detailsTechniques")}</summary>
          <pre dir="ltr" className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono">
            {detail} · {window.location.pathname}
          </pre>
        </details>
      </div>
    </div>
  );
};

/** Dernier filet : une erreur d'affichage montre un message et un bouton « Recharger » au lieu d'une page blanche. */
export class LimiteErreur extends Component<{ children: ReactNode }, { erreur: unknown; enErreur: boolean }> {
  state: { erreur: unknown; enErreur: boolean } = { erreur: null, enErreur: false };

  static getDerivedStateFromError(erreur: unknown) {
    return { erreur, enErreur: true };
  }

  componentDidCatch(erreur: unknown, infos: ErrorInfo) {
    // Fichier d'une ancienne version (nouveau déploiement) : un rechargement suffit.
    if (estErreurChargementModule(erreur) && rechargerApresDeploiement()) return;
    console.error(erreur, infos.componentStack);
  }

  render() {
    return this.state.enErreur ? <PageEnErreur erreur={this.state.erreur} /> : this.props.children;
  }
}

/** Limite remise à zéro à chaque changement de page : une erreur sur une page ne bloque pas les autres. */
export const LimiteErreurParPage = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return <LimiteErreur key={pathname}>{children}</LimiteErreur>;
};
