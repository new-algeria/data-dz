import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { BadgeCategorie } from "@/components/BadgeCategorie";
import { useLangue } from "@/hooks/use-langue";
import { chargerCategories } from "@/lib/catalogue";
import { localeNombres } from "@/lib/fichiers";
import { chargerWilayas } from "@/lib/referentiels";
import { routes } from "@/lib/routes";
import type { Soumission } from "@/lib/soumissions";
import { texteTraduit } from "@/lib/traduction";

const Ligne = ({ libelle, children }: { libelle: string; children: ReactNode }) => (
  <div className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
    <dt className="text-sm font-medium text-muted-foreground">{libelle}</dt>
    <dd className="min-w-0 text-sm">{children}</dd>
  </div>
);

const LANGUES = ["fr", "en", "ar"] as const;

/** Contenu d'une proposition en lecture seule (auteur après traitement, ou modérateur). */
export const DetailsProposition = ({ soumission: s }: { soumission: Soumission }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const { data: wilayas = [] } = useQuery({ queryKey: ["wilayas"], queryFn: chargerWilayas, staleTime: Infinity });
  const categorie = categories.find((c) => c.slug === s.categorie_slug);
  // Dates sans heure (« 2024-01-01 ») : lues en UTC pour ne pas glisser d'un jour.
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium", timeZone: "UTC" });
  const nomWilaya = (code: string) => {
    const nom = texteTraduit(wilayas.find((w) => w.code === code)?.nom, langue);
    return nom ? `${code} · ${nom}` : code;
  };
  const periode = [s.periode_debut, s.periode_fin].map((date) => (date ? formatDate.format(new Date(date)) : "…"));
  const vide = <span className="text-muted-foreground">—</span>;

  return (
    <dl className="divide-y">
      <Ligne libelle={t("propositions.detail.type")}>
        {t(`propositions.types.${s.type}`)}
        {s.dataset && (
          <>
            {" · "}
            <Link to={routes.donnee(s.dataset.slug)} className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400">
              {texteTraduit(s.dataset.titre, langue)}
            </Link>
          </>
        )}
      </Ligne>
      {LANGUES.map((code) =>
        s.titre[code] ? (
          <Ligne key={`titre-${code}`} libelle={t(`propositions.champs.titre${code === "fr" ? "Fr" : code === "en" ? "En" : "Ar"}`)}>
            <span lang={code} dir={code === "ar" ? "rtl" : "ltr"} className="font-medium">
              {s.titre[code]}
            </span>
          </Ligne>
        ) : null
      )}
      {LANGUES.map((code) =>
        s.description?.[code] ? (
          <Ligne key={`description-${code}`} libelle={t(`propositions.champs.description${code === "fr" ? "Fr" : code === "en" ? "En" : "Ar"}`)}>
            <p lang={code} dir={code === "ar" ? "rtl" : "ltr"} className="whitespace-pre-line">
              {s.description[code]}
            </p>
          </Ligne>
        ) : null
      )}
      <Ligne libelle={t("propositions.champs.categorie")}>
        {categorie ? <BadgeCategorie nom={categorie.nom} icone={categorie.icone} /> : s.categorie_slug || vide}
      </Ligne>
      <Ligne libelle={t("propositions.champs.licence")}>
        {s.licence_code ? <span dir="ltr" className="font-mono text-xs">{s.licence_code}</span> : t("propositions.champs.licenceInconnue")}
      </Ligne>
      <Ligne libelle={t("propositions.sections.source")}>
        {s.source_nom || s.source_url ? (
          <span className="flex flex-wrap items-center gap-2">
            {s.source_nom && <span dir="auto">{s.source_nom}</span>}
            {s.source_url && (
              <a href={s.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-emerald-700 hover:underline dark:text-emerald-400" dir="ltr">
                {s.source_url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            )}
          </span>
        ) : (
          vide
        )}
      </Ligne>
      <Ligne libelle={t("propositions.champs.motsCles")}>
        {s.mots_cles.length ? (
          <span className="flex flex-wrap gap-1.5">
            {s.mots_cles.map((mot) => (
              <span key={mot} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-white/10" dir="auto">
                {mot}
              </span>
            ))}
          </span>
        ) : (
          vide
        )}
      </Ligne>
      <Ligne libelle={t("propositions.champs.wilayas")}>
        {s.wilayas.length ? s.wilayas.map(nomWilaya).join(", ") : t("propositions.champs.toutesWilayas")}
      </Ligne>
      <Ligne libelle={t("propositions.detail.periode")}>{s.periode_debut || s.periode_fin ? periode.join(" – ") : vide}</Ligne>
      {s.message && (
        <Ligne libelle={t("propositions.champs.message")}>
          <p className="whitespace-pre-line rounded-lg bg-amber-50 p-3 text-amber-950 dark:bg-amber-400/10 dark:text-amber-100" dir="auto">
            {s.message}
          </p>
        </Ligne>
      )}
    </dl>
  );
};
