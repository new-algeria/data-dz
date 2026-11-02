import { useTranslation } from "react-i18next";

/**
 * Mention sous les fichiers d'une source. OpenStreetMap (ODbL) exige la citation « © contributeurs OpenStreetMap »
 * avec un lien vers sa page de droits d'auteur ; les autres sources ont leur attribution dans l'en-tête de la fiche.
 */
export const MentionSource = ({ source, licence }: { source: { slug: string; nom: string }; licence?: string | null }) => {
  const { t } = useTranslation();
  if (source.slug === "openstreetmap") {
    return (
      <p className="text-xs text-muted-foreground">
        {t("fiche.sources.osmAvant")}{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
          © {t("fiche.sources.osmContributeurs")}
        </a>
        {" — "}ODbL 1.0. {t("fiche.sources.osmApres")}
      </p>
    );
  }
  return licence ? <p className="text-xs text-muted-foreground">{t("fiche.sources.licence", { source: source.nom, licence })}</p> : null;
};
