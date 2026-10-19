import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CalendarDays, Globe, ShieldCheck, UserRoundPen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { AvatarMembre } from "@/components/AvatarMembre";
import { EtatErreur } from "@/components/EtatErreur";
import { PageIntrouvable } from "@/components/PageIntrouvable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { chargerMembre, FORMAT_SITE_WEB, type Profil } from "@/lib/profils";
import { localeNombres } from "@/lib/fichiers";
import { cn } from "@/lib/utils";

const BadgeRole = ({ role }: { role: Profil["role"] }) => {
  const { t } = useTranslation();
  if (role !== "moderateur" && role !== "admin") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        role === "admin"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
          : "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300"
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      {t(`membre.roles.${role}`)}
    </span>
  );
};

/** Nom de domaine affiché pour le site web (https://exemple.dz/page → exemple.dz/page). */
const siteLisible = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

const FicheMembre = ({ membre }: { membre: Profil }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { utilisateur } = useAuth();
  const nom = membre.nom_affiche || membre.pseudo;
  const inscription = new Intl.DateTimeFormat(localeNombres(langue), { month: "long", year: "numeric" }).format(new Date(membre.cree_le));

  return (
    <>
      <CustomMetaTags title={`${nom} (@${membre.pseudo}) - data-dz`} description={membre.bio || t("membre.description", { nom })} path={`/membres/${membre.pseudo}`} />
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-gray-50 pt-16 dark:from-[#03140f] dark:via-gray-900 dark:to-gray-900">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 end-[-6rem] h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl animate-flotter dark:bg-emerald-600/15" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative container mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-12 text-center sm:flex-row sm:items-end sm:text-start"
        >
          <AvatarMembre profil={membre} className="h-28 w-28 text-3xl ring-4 ring-white shadow-lg dark:ring-gray-800" />
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white" dir="auto">
                {nom}
              </h1>
              <BadgeRole role={membre.role} />
            </div>
            <p className="font-mono text-sm text-muted-foreground" dir="ltr">
              @{membre.pseudo}
            </p>
          </div>
          {utilisateur?.id === membre.id && (
            <Button asChild variant="outline" size="sm" className="gap-2 bg-white/70 dark:bg-white/5">
              <Link to="/profil">
                <UserRoundPen className="h-4 w-4" />
                {t("membre.modifier")}
              </Link>
            </Button>
          )}
        </motion.div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800">
          {membre.bio ? (
            <p className="whitespace-pre-line text-gray-700 dark:text-gray-200" dir="auto">
              {membre.bio}
            </p>
          ) : (
            <p className="italic text-muted-foreground">{t("membre.pasDeBio")}</p>
          )}
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-4 text-sm text-muted-foreground dark:border-white/10">
            {membre.site_web && FORMAT_SITE_WEB.test(membre.site_web) && (
              <li className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" aria-hidden />
                {/* Lien saisi par le membre : pas de transmission de référent ni de crédit SEO. */}
                <a
                  href={membre.site_web}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  dir="ltr"
                >
                  {siteLisible(membre.site_web)}
                </a>
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {t("membre.inscritDepuis", { date: inscription })}
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

const PageMembre = () => {
  const { t } = useTranslation();
  const { pseudo = "" } = useParams();
  const requete = useQuery({
    queryKey: ["membre", pseudo.toLowerCase()],
    queryFn: () => chargerMembre(pseudo),
    enabled: Boolean(pseudo),
  });

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
