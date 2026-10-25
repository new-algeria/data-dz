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
    // 2 × 2 sur mobile, une seule ligne de 4 dès que la place le permet (hero compact).
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {tuiles.map((tuile, indice) => (
        <motion.div
          key={tuile.cle}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + indice * 0.12, duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="min-w-0 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md px-3 py-2.5 text-start shadow-sm"
        >
          <div className="flex items-center gap-1.5">
            <tuile.icone className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {isPending ? (
              <Skeleton className="h-7 w-14" />
            ) : (
              <p className="truncate text-xl font-bold text-emerald-800 dark:text-emerald-300 sm:text-2xl">
                <NombreAnime valeur={tuile.valeur ?? 0} />
              </p>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 leading-tight">{tuile.libelle}</p>
        </motion.div>
      ))}
    </div>
  );
};
