import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin } from "lucide-react";
import { routes } from "@/lib/routes";

/** Encart de l'accueil (sous les thématiques) : mène à « Ma wilaya en chiffres ». Léger : ni carte ni requête. */
export const EncartMaWilaya = () => {
  const { t } = useTranslation();
  return (
    <section className="px-4 pb-4 pt-10" aria-labelledby="titre-encart-wilaya">
      <div className="mx-auto max-w-7xl">
        <Link
          to={routes.wilayas}
          className="group flex flex-col items-start gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center md:p-8"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15" aria-hidden>
            <MapPin className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span id="titre-encart-wilaya" className="block text-2xl font-bold md:text-3xl">
              {t("wilayas.encartTitre")}
            </span>
            <span className="mt-1 block text-emerald-50/90">{t("wilayas.encartTexte")}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-emerald-800 shadow-sm transition-colors group-hover:bg-emerald-50">
            {t("wilayas.encartBouton")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </div>
    </section>
  );
};
