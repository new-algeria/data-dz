import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BellRing, Star } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { CarteDonnee, CarteDonneeSquelette } from "@/components/catalogue/CarteDonnee";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexte/ContexteAuth";
import { chargerCategories } from "@/lib/catalogue";
import { chargerFavoris } from "@/lib/communaute";
import { cleErreur } from "@/lib/erreurs";
import { routes } from "@/lib/routes";
import type { ResumeDonnee } from "@/lib/types";

/** /favorites : les données suivies par le membre (watchlist). */
const Favoris = () => {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const requete = useQuery({ queryKey: ["favoris", utilisateur?.id], queryFn: chargerFavoris, enabled: Boolean(utilisateur) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const parSlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  // Une donnée dépubliée depuis n'est plus lisible (RLS) : elle disparaît de la liste.
  const donnees = (requete.data ?? []).map((favori) => favori.dataset).filter((d): d is ResumeDonnee => d !== null);

  return (
    <MiseEnPage titre={t("favoris.titre")} sousTitre={t("favoris.sousTitre")} chemin={routes.favoris} largeur="large">
      <p className="mb-6 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t("favoris.aideNotifications")}
      </p>
      {requete.isPending ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <CarteDonneeSquelette key={i} />
          ))}
        </div>
      ) : requete.isError ? (
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      ) : donnees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-white px-4 py-16 text-center dark:bg-gray-800">
          <Star className="h-10 w-10 text-amber-400" aria-hidden />
          <p className="font-medium">{t("favoris.vide")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("favoris.videTexte")}</p>
          <Button asChild className="mt-2 bg-emerald-700 text-white hover:bg-emerald-800">
            <Link to={routes.catalogue}>{t("favoris.explorer")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{t("favoris.compteur", { count: donnees.length })}</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {donnees.map((donnee) => (
              <CarteDonnee key={donnee.id} donnee={donnee} categorie={donnee.categorie_slug ? parSlug.get(donnee.categorie_slug) : undefined} />
            ))}
          </div>
        </>
      )}
    </MiseEnPage>
  );
};

export default Favoris;
