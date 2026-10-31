import { useTranslation } from "react-i18next";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { CarteThematique, CarteThematiqueSquelette } from "@/components/thematiques/CarteThematique";
import { useThematiques } from "@/hooks/use-thematiques";
import { routes } from "@/lib/routes";

/** /themes : toutes les thématiques, avec leurs données les plus récentes et un lien vers le catalogue filtré. */
const PageThematiques = () => {
  const { t } = useTranslation();
  const { thematiques, chargement, erreur, reessayer } = useThematiques(3);

  return (
    <MiseEnPage titre={t("thematiques.titre")} sousTitre={t("thematiques.sousTitrePage")} chemin={routes.thematiques} largeur="large">
      {erreur ? (
        <EtatErreur message={t("catalogue.erreur")} onReessayer={reessayer} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={chargement}>
          {chargement
            ? Array.from({ length: 6 }, (_, indice) => <CarteThematiqueSquelette key={indice} />)
            : thematiques.map((thematique) => <CarteThematique key={thematique.categorie.slug} thematique={thematique} detaillee />)}
        </div>
      )}
    </MiseEnPage>
  );
};

export default PageThematiques;
