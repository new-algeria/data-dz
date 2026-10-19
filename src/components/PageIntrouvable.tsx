import { Link } from "react-router-dom";
import { ArrowLeft, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/** Contenu d'une page 404 (à placer entre l'en-tête et le pied de page). */
export const PageIntrouvable = ({ titre, texte }: { titre: string; texte: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center px-4 py-24 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        <SearchX className="h-8 w-8" aria-hidden />
      </span>
      <p className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{titre}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{texte}</p>
      <Button asChild variant="outline" className="mt-6 gap-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("introuvable.retourAccueil")}
        </Link>
      </Button>
    </div>
  );
};
