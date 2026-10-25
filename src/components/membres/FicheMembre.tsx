import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CalendarDays, Globe, ShieldCheck } from "lucide-react";
import { AvatarMembre } from "@/components/AvatarMembre";
import { useLangue } from "@/hooks/use-langue";
import { FORMAT_SITE_WEB, type Profil } from "@/lib/profils";
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

/** En-tête de la page d'un membre (avatar, nom, rôle, pseudo), identique pour lui et pour les visiteurs. */
export const EnTeteMembre = ({ membre, action }: { membre: Profil; action?: ReactNode }) => {
  const nom = membre.nom_affiche || membre.pseudo;
  return (
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
        {action}
      </motion.div>
    </section>
  );
};

/** Bio, site web et date d'inscription d'un membre. */
export const CarteBio = ({ membre }: { membre: Profil }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const inscription = new Intl.DateTimeFormat(localeNombres(langue), { month: "long", year: "numeric" }).format(new Date(membre.cree_le));
  return (
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
  );
};
