import { Suspense, useState } from "react";
import { lazyAvecRechargement } from "@/lib/rechargement";
import { useTranslation } from "react-i18next";
import { ChartLine, Map as IconeCarte } from "lucide-react";
import { motion } from "framer-motion";
import { EtatErreur } from "@/components/EtatErreur";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVisuel, type VueVisuel } from "@/hooks/use-visuel";
import type { Fichier } from "@/lib/types";

// MapLibre et Recharts ne sont chargés que sur les fiches qui en ont besoin.
const GlobeDonnees = lazyAvecRechargement(() => import("@/components/fiche/GlobeDonnees"));
const CarteDepuisLignes = lazyAvecRechargement(() => import("./CarteDepuisLignes"));
const GraphiqueVisuel = lazyAvecRechargement(() => import("./GraphiqueVisuel"));

/** Hauteur fixe du visuel : 260 px sur mobile, 380 px à partir de md. */
export const HAUTEUR_VISUEL = "h-[260px] md:h-[380px]";

const Squelette = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3" role="status" aria-label={t("visuel.chargement")}>
      <Skeleton className="h-5 w-56" />
      <Skeleton className={`w-full rounded-xl ${HAUTEUR_VISUEL}`} />
    </div>
  );
};

interface VisuelDonneeProps {
  slug: string;
  titre: string;
  source: string | null;
  fichiers: Fichier[];
}

/**
 * Visuel détecté automatiquement en tête de fiche : carte (GeoJSON, coordonnées, wilayas) ou graphique.
 * Rien n'est affiché si le jeu n'a rien de traçable. Si les deux existent, un sélecteur permet de basculer.
 */
export const VisuelDonnee = ({ slug, titre, source, fichiers }: VisuelDonneeProps) => {
  const { t } = useTranslation();
  const [vueDemandee, setVueDemandee] = useState<VueVisuel | null>(null);
  const etat = useVisuel(slug, fichiers, vueDemandee);

  if (etat.statut === "aucun") return null;
  const { detection, vue, lignes } = etat;
  const deuxVues = Boolean(detection?.carte && detection?.graphique);
  const carteGeojson = detection?.carte?.genre === "points" && detection.carte.origine === "geojson";
  const besoinLignes = vue === "graphique" || (vue === "carte" && !carteGeojson);

  let contenu = <Squelette />;
  if (detection && vue) {
    if (besoinLignes && etat.erreurLignes) contenu = <EtatErreur message={t("visuel.erreur")} />;
    else if (vue === "carte" && detection.carte?.genre === "points" && detection.carte.origine === "geojson") {
      // Tous les GeoJSON du jeu restent proposés dans le sélecteur de la carte.
      const geojsons = fichiers.filter((fichier) => fichier.format.toLowerCase() === "geojson");
      contenu = <GlobeDonnees fichiers={geojsons} initial={detection.carte.fichierId} hauteur={HAUTEUR_VISUEL} projection="mercator" />;
    } else if (lignes && vue === "carte" && detection.carte && !(detection.carte.genre === "points" && detection.carte.origine === "geojson")) {
      contenu = <CarteDepuisLignes visuel={detection.carte} lignes={lignes} hauteur={HAUTEUR_VISUEL} />;
    } else if (lignes && vue === "graphique" && detection.graphique) {
      contenu = <GraphiqueVisuel visuel={detection.graphique} lignes={lignes} titreJeu={titre} source={source} slug={slug} hauteur={HAUTEUR_VISUEL} />;
    }
  }

  return (
    <motion.section
      aria-label={t("visuel.titre")}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm md:p-5 dark:border-white/10 dark:bg-gray-800"
    >
      {deuxVues && vue && (
        <div className="mb-3 flex justify-end">
          <ToggleGroup
            type="single"
            value={vue}
            onValueChange={(valeur) => valeur && setVueDemandee(valeur as VueVisuel)}
            className="rounded-lg bg-muted p-1"
            aria-label={t("visuel.choixVue")}
          >
            <ToggleGroupItem value="carte" size="sm" className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <IconeCarte className="h-4 w-4" aria-hidden />
              {t("visuel.carte")}
            </ToggleGroupItem>
            <ToggleGroupItem value="graphique" size="sm" className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <ChartLine className="h-4 w-4" aria-hidden />
              {t("visuel.graphique")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <Suspense fallback={<Squelette />}>{contenu}</Suspense>

      {source && <p className="mt-2 text-xs text-muted-foreground">{t("visuel.source", { source })}</p>}
    </motion.section>
  );
};
