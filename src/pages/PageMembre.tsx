import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { CarteBio, EnTeteMembre } from "@/components/membres/FicheMembre";
import { EtatErreur } from "@/components/EtatErreur";
import { PageIntrouvable } from "@/components/PageIntrouvable";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexte/ContexteAuth";
import { chargerMembre, type Profil } from "@/lib/profils";
import { routes } from "@/lib/routes";

const FicheMembre = ({ membre }: { membre: Profil }) => {
  const { t } = useTranslation();
  const nom = membre.nom_affiche || membre.pseudo;
  return (
    <>
      <CustomMetaTags title={`${nom} (@${membre.pseudo}) - data-dz`} description={membre.bio || t("membre.description", { nom })} path={routes.membre(membre.pseudo)} />
      <EnTeteMembre membre={membre} />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <CarteBio membre={membre} />
      </div>
    </>
  );
};

const PageMembre = () => {
  const { t } = useTranslation();
  const { pseudo = "" } = useParams();
  const { profil } = useAuth();
  const requete = useQuery({
    queryKey: ["membre", pseudo.toLowerCase()],
    queryFn: () => chargerMembre(pseudo),
    enabled: Boolean(pseudo),
  });

  // Sa propre page : une seule page « Mon profil », qui montre aussi ce que voient les autres.
  if (profil && profil.pseudo === pseudo.toLowerCase()) return <Navigate to={routes.profil} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1">
        {requete.isPending ? (
          <div className="container mx-auto max-w-3xl space-y-4 px-4 pt-28" aria-busy="true">
            <div className="flex items-end gap-5">
              <Skeleton className="h-28 w-28 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : requete.isError ? (
          <div className="container mx-auto px-4 pt-28">
            <EtatErreur message={t("membre.erreur")} onReessayer={() => requete.refetch()} />
          </div>
        ) : !requete.data ? (
          <>
            <CustomMetaTags title={`${t("membre.introuvableTitre")} - data-dz`} description={t("membre.introuvableTexte", { pseudo })} />
            <div className="pt-16">
              <PageIntrouvable titre={t("membre.introuvableTitre")} texte={t("membre.introuvableTexte", { pseudo })} />
            </div>
          </>
        ) : (
          <FicheMembre membre={requete.data} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PageMembre;
