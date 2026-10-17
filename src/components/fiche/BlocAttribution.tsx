import { useId } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Bug, ExternalLink, Info } from "lucide-react";
import type { Donnee } from "@/lib/types";

const lienExterne = "text-green-700 dark:text-green-400 underline underline-offset-2 hover:no-underline";

function contientOpenStreetMap(donnee: Donnee): boolean {
  return donnee.licence_code === "ODbL-1.0" || /openstreetmap|\bosm\b/i.test(donnee.licence_details ?? "");
}

/** Attribution obligatoire pour les données synchronisées depuis GeoAlgeria (Yasser's studio). */
export const BlocAttribution = ({ donnee }: { donnee: Donnee }) => {
  const { t } = useTranslation();
  const idTitre = useId();

  if (donnee.sources?.slug !== "geoalgeria") return null;

  const licence = [donnee.licence_code, donnee.licence_details].filter(Boolean).join(" · ");

  return (
    <section
      aria-labelledby={idTitre}
      className="rounded-lg border border-green-600/30 bg-green-50 dark:bg-green-950/30 p-5 space-y-3 text-sm"
    >
      <h2 id={idTitre} className="flex items-center gap-2 text-base font-semibold">
        <Info className="h-4 w-4" aria-hidden />
        {t("attribution.titre")}
      </h2>
      <p className="font-medium">
        <Trans
          i18nKey="attribution.geoalgeria"
          components={{
            lien: <a href="https://geoalgeria.com" target="_blank" rel="noopener noreferrer" className={lienExterne} />,
          }}
        />
      </p>
      {licence && <p dir="auto">{t("attribution.licence", { licence })}</p>}
      {contientOpenStreetMap(donnee) && <p className="text-muted-foreground">{t("attribution.osm")}</p>}
      <ul className="space-y-1.5">
        {donnee.url_source && (
          <li>
            <a href={donnee.url_source} target="_blank" rel="noopener noreferrer" className={`${lienExterne} inline-flex items-center gap-1`}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("attribution.pageSource")}
            </a>
          </li>
        )}
        <li>
          <a
            href="https://github.com/yasserstudio/geoalgeria/issues"
            target="_blank"
            rel="noopener noreferrer"
            className={`${lienExterne} inline-flex items-center gap-1`}
          >
            <Bug className="h-3.5 w-3.5" aria-hidden />
            {t("attribution.signaler")}
          </a>
        </li>
      </ul>
    </section>
  );
};
