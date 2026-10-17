import { Check, ExternalLink, Scale, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Donnee } from "@/lib/types";

/** Licence mise en avant, avec ce qu'elle autorise, d'après la table `licences`. */
export const BlocLicence = ({ donnee }: { donnee: Donnee }) => {
  const { t } = useTranslation();
  const licence = donnee.licences;

  if (!donnee.licence_code && !donnee.licence_details) return null;

  const droits = licence
    ? [
        {
          cle: "commercial",
          actif: licence.usage_commercial,
          libelle: licence.usage_commercial ? t("licence.commercialOui") : t("licence.commercialNon"),
          positif: licence.usage_commercial,
        },
        {
          cle: "attribution",
          actif: licence.attribution_requise,
          libelle: licence.attribution_requise ? t("licence.attributionOui") : t("licence.attributionNon"),
          positif: true,
        },
        {
          cle: "partage",
          actif: licence.partage_identique,
          libelle: licence.partage_identique ? t("licence.partageOui") : t("licence.partageNon"),
          positif: true,
        },
      ].filter((droit) => droit.actif !== undefined)
    : [];

  return (
    <section
      aria-labelledby="titre-licence"
      className="rounded-2xl border border-emerald-600/20 bg-white dark:bg-gray-800 p-5 shadow-sm"
    >
      <h2 id="titre-licence" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Scale className="h-4 w-4" aria-hidden />
        {t("fiche.licence")}
      </h2>
      <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
        {donnee.licence_code}
      </p>
      {licence?.nom && <p className="text-sm text-muted-foreground">{licence.nom}</p>}

      {droits.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {droits.map((droit) => (
            <li key={droit.cle} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  droit.positif
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                )}
                aria-hidden
              >
                {droit.positif ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              {droit.libelle}
            </li>
          ))}
        </ul>
      )}

      {donnee.licence_details && (
        <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground" dir="auto">
          {donnee.licence_details}
        </p>
      )}

      {licence?.url && (
        <a
          href={licence.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("licence.lire")}
        </a>
      )}
    </section>
  );
};
