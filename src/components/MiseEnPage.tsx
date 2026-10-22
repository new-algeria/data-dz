import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { cn } from "@/lib/utils";

interface MiseEnPageProps {
  titre: string;
  sousTitre?: string;
  chemin?: string;
  /** Boutons affichés à droite du titre. */
  actions?: ReactNode;
  /** Fil d'Ariane ou lien de retour au-dessus du titre. */
  avant?: ReactNode;
  largeur?: "etroite" | "large";
  children: ReactNode;
}

/** Gabarit des pages de compte, de propositions et de modération. */
export const MiseEnPage = ({ titre, sousTitre, chemin, actions, avant, largeur = "etroite", children }: MiseEnPageProps) => (
  <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
    <CustomMetaTags title={`${titre} - data-dz`} description={sousTitre ?? titre} path={chemin} />
    <Navbar />
    <main className={cn("container mx-auto flex-1 px-4 pb-16 pt-24", largeur === "etroite" ? "max-w-3xl" : "max-w-6xl")}>
      {avant && <div className="mb-4">{avant}</div>}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{titre}</h1>
          {sousTitre && <p className="mt-1 text-sm text-muted-foreground">{sousTitre}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </main>
    <Footer />
  </div>
);

/** Carte blanche avec un titre, utilisée dans toutes ces pages. */
export const Carte = ({ titre, children, className }: { titre?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn("rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-gray-800", className)}>
    {titre && <h2 className="mb-4 text-lg font-semibold">{titre}</h2>}
    {children}
  </section>
);
