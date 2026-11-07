import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Database, FilePlus2 } from "lucide-react";
import { CarteDonnee, CarteDonneeSquelette } from "@/components/catalogue/CarteDonnee";
import { Button } from "@/components/ui/button";
import { chargerCatalogue, chargerCategories } from "@/lib/catalogue";
import { chargerDonneesProposees, donneesDansLOrdre } from "@/lib/contributions";
import { routes } from "@/lib/routes";

/**
 * « Données proposées » sur la page d'un membre (et sur « Mon profil ») : ses propositions devenues des données
 * publiées, en cartes comme dans le catalogue (même requête que l'accueil : rien de plus à télécharger).
 * Pour un autre membre sans donnée, la section n'apparaît pas ; sur son propre profil, une invitation à proposer.
 */
export const DonneesProposees = ({ pseudo, soi = false }: { pseudo: string; soi?: boolean }) => {
  const { t } = useTranslation();
  const proposees = useQuery({ queryKey: ["donnees-proposees", pseudo], queryFn: () => chargerDonneesProposees(pseudo) });
  const aDesDonnees = (proposees.data?.length ?? 0) > 0;
  const catalogue = useQuery({
    queryKey: ["catalogue", "", null],
    queryFn: () => chargerCatalogue({ terme: "", categorie: null }),
    enabled: aDesDonnees,
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const parCategorie = useMemo(() => new Map(categories.map((categorie) => [categorie.slug, categorie])), [categories]);
  const donnees = useMemo(() => donneesDansLOrdre(proposees.data ?? [], catalogue.data ?? []), [proposees.data, catalogue.data]);

  if (proposees.isError || (proposees.isSuccess && !aDesDonnees && !soi)) return null;
  const chargement = proposees.isPending || (aDesDonnees && catalogue.isPending);

  return (
    <section aria-labelledby="titre-donnees-proposees" className="space-y-4">
      <h2 id="titre-donnees-proposees" className="flex items-center gap-2 text-lg font-semibold">
        <Database className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden />
        {t("membre.donneesProposees")}
        {aDesDonnees && (
          <span className="rounded-full bg-emerald-100 px-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
            {proposees.data?.length}
          </span>
        )}
      </h2>

      {chargement ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2" aria-busy="true">
          <CarteDonneeSquelette />
          <CarteDonneeSquelette />
        </div>
      ) : donnees.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {donnees.map((donnee) => (
            <CarteDonnee key={donnee.slug} donnee={donnee} categorie={donnee.categorie_slug ? parCategorie.get(donnee.categorie_slug) : undefined} />
          ))}
        </div>
      ) : (
        // Seulement sur son propre profil : aucune donnée publiée encore.
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-white/15 dark:bg-gray-800">
          <p className="text-sm text-muted-foreground">{t("membre.aucuneDonneeProposee")}</p>
          <Button asChild className="mt-4 gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
            <Link to={routes.proposer}>
              <FilePlus2 className="h-4 w-4" aria-hidden />
              {t("navbar.proposer")}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
};
