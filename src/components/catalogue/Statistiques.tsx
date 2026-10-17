import { motion } from "framer-motion";
import { Database, FolderTree, Rows3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { chargerStatistiques } from "@/lib/catalogue";
import { formaterNombre } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import { Skeleton } from "@/components/ui/skeleton";

// Chiffres calculés à partir de la base : aucune valeur n'est écrite en dur.
export const Statistiques = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { data: statistiques, isPending, isError } = useQuery({
    queryKey: ["statistiques"],
    queryFn: chargerStatistiques,
  });

  if (isError) return null;

  const tuiles = [
    { cle: "donnees", libelle: t("statistiques.donnees"), valeur: statistiques?.nbDonnees, icone: Database },
    { cle: "categories", libelle: t("statistiques.categories"), valeur: statistiques?.nbCategories, icone: FolderTree },
    { cle: "lignes", libelle: t("statistiques.lignes"), valeur: statistiques?.totalLignes, icone: Rows3 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto px-4">
      {tuiles.map((tuile, indice) => (
        <motion.div
          key={tuile.cle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: indice * 0.1 }}
          className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow text-center"
        >
          <tuile.icone className="w-8 h-8 mx-auto mb-2 text-primary dark:text-green-400" />
          {isPending ? (
            <Skeleton className="h-9 w-24 mx-auto mb-1" />
          ) : (
            <p className="text-3xl font-bold text-primary dark:text-green-400 mb-1">
              {formaterNombre(tuile.valeur ?? 0, langue)}
            </p>
          )}
          <p className="text-gray-600 dark:text-gray-400">{tuile.libelle}</p>
        </motion.div>
      ))}
    </div>
  );
};
