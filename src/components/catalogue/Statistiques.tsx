import { motion } from "framer-motion";
import { Database, FolderTree, Rows3, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { chargerStatistiques } from "@/lib/catalogue";
import { Skeleton } from "@/components/ui/skeleton";
import { NombreAnime } from "@/components/accueil/NombreAnime";

// Chiffres calculés à partir de la base : aucune valeur n'est écrite en dur.
export const Statistiques = () => {
  const { t } = useTranslation();
  const { data: statistiques, isPending, isError } = useQuery({
    queryKey: ["statistiques"],
    queryFn: chargerStatistiques,
  });

  if (isError) return null;

  const tuiles = [
    { cle: "donnees", libelle: t("statistiques.donnees"), valeur: statistiques?.nbDonnees, icone: Database },
    { cle: "categories", libelle: t("statistiques.categories"), valeur: statistiques?.nbCategories, icone: FolderTree },
    { cle: "lignes", libelle: t("statistiques.lignes"), valeur: statistiques?.totalLignes, icone: Rows3 },
    { cle: "membres", libelle: t("statistiques.membres"), valeur: statistiques?.nbMembres, icone: UsersRound },
  ];

  return (
    // 2 × 2 sur mobile et dans la colonne étroite du hero (lg), 4 colonnes quand la place le permet.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-4">
      {tuiles.map((tuile, indice) => (
        <motion.div
          key={tuile.cle}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + indice * 0.12, duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="min-w-0 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md p-3 sm:p-4 shadow-sm"
        >
          <tuile.icone className="w-5 h-5 mb-2 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {isPending ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <p className="truncate text-2xl font-bold text-emerald-800 dark:text-emerald-300 mb-0.5 sm:text-3xl">
              <NombreAnime valeur={tuile.valeur ?? 0} />
            </p>
          )}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">{tuile.libelle}</p>
        </motion.div>
      ))}
    </div>
  );
};
