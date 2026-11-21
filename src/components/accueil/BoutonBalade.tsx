import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Rotate3d } from "lucide-react";
import { routes } from "@/lib/routes";
import "./bouton-balade.css";

/**
 * Lien vers la balade 3D, à côté de « Explorer les X jeux de données » : fond encre, bordure aux couleurs du
 * drapeau qui tourne lentement, icône qui pivote au survol. Animations coupées avec « réduire les animations ».
 */
export const BoutonBalade = () => {
  const { t } = useTranslation();
  return (
    <Link to={routes.balade} className="bouton-balade group">
      <span className="bouton-balade-fond">
        <Rotate3d className="bouton-balade-icone" aria-hidden />
        <span>{t("accueil.balade")}</span>
        <span className="bouton-balade-badge">3D</span>
      </span>
    </Link>
  );
};
