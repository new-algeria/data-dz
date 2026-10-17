import { motion } from "framer-motion";
import { CalendarClock, Columns3, Files, Rows3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { NombreAnime } from "@/components/accueil/NombreAnime";

interface ChiffresClesProps {
  nbLignes: number | null | undefined;
  nbColonnes: number;
  nbFichiers: number;
  miseAJour: string | null;
}

export const ChiffresCles = ({ nbLignes, nbColonnes, nbFichiers, miseAJour }: ChiffresClesProps) => {
  const { t } = useTranslation();

  const tuiles: { cle: string; libelle: string; valeur: ReactNode; icone: typeof Rows3 }[] = [];
  if (nbLignes !== null && nbLignes !== undefined) {
    tuiles.push({ cle: "lignes", libelle: t("fiche.lignes"), valeur: <NombreAnime valeur={nbLignes} />, icone: Rows3 });
  }
  if (nbColonnes > 0) {
    tuiles.push({ cle: "colonnes", libelle: t("fiche.colonnes"), valeur: <NombreAnime valeur={nbColonnes} />, icone: Columns3 });
  }
  tuiles.push({ cle: "fichiers", libelle: t("fiche.fichiers"), valeur: <NombreAnime valeur={nbFichiers} />, icone: Files });
  if (miseAJour) {
    tuiles.push({ cle: "maj", libelle: t("fiche.miseAJour"), valeur: miseAJour, icone: CalendarClock });
  }

  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {tuiles.map((tuile, indice) => (
        <motion.div
          key={tuile.cle}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + indice * 0.08, duration: 0.4, ease: "easeOut" }}
          className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-gray-800 p-4 shadow-sm"
        >
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <tuile.icone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {tuile.libelle}
          </dt>
          <dd className="mt-1.5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{tuile.valeur}</dd>
        </motion.div>
      ))}
    </dl>
  );
};
