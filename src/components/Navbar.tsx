import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Plus, ShieldCheck, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useEstModerateur, useNbEnAttente } from "@/hooks/use-moderateur";
import { useAuth } from "@/contexte/ContexteAuth";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./LanguageSelector";
import { MenuUtilisateur } from "./auth/MenuUtilisateur";
import { ClocheNotifications } from "./communaute/ClocheNotifications";
import { MenuMobile } from "./MenuMobile";
import ICONE_DATA_DZ from "@/assets/img/data_dz_logo_icon.png";

/** Lien « Modération » avec le nombre de propositions en attente (modérateurs et admins seulement). */
const LienModeration = () => {
  const { t } = useTranslation();
  const { data: moderateur } = useEstModerateur();
  const { data: enAttente = 0 } = useNbEnAttente(Boolean(moderateur));
  if (!moderateur) return null;
  const libelle = enAttente > 0 ? t("navbar.moderationEnAttente", { count: enAttente }) : t("navbar.moderation");
  return (
    <Button asChild variant="ghost" size="sm" className="relative gap-2 px-2 sm:px-3">
      <Link to={routes.moderation} aria-label={libelle} title={libelle}>
        <ShieldCheck className="h-4 w-4" />
        <span className="hidden lg:inline">{t("navbar.moderation")}</span>
        {enAttente > 0 && (
          <span className="absolute -end-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-[1.15rem] text-white tabular-nums lg:static lg:text-xs">
            {enAttente > 99 ? "99+" : enAttente}
          </span>
        )}
      </Link>
    </Button>
  );
};

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const [defile, setDefile] = useState(false);

  useEffect(() => {
    const surDefilement = () => setDefile(window.scrollY > 8);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-40 w-full transition-all duration-300",
        defile
          ? "border-b border-gray-200/70 bg-white/80 shadow-sm backdrop-blur-lg dark:border-white/10 dark:bg-gray-950/80"
          : "border-b border-transparent bg-white/40 backdrop-blur-sm dark:bg-gray-950/30"
      )}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between gap-3 px-4" aria-label="data-dz">
        <Link to={routes.accueil} className="group flex shrink-0 items-center gap-2.5" aria-label="data-dz">
          <img
            src={ICONE_DATA_DZ}
            alt=""
            className="h-9 w-9 transition-transform duration-500 group-hover:rotate-[20deg]"
          />
          <span className="whitespace-nowrap text-xl font-bold tracking-tight text-gray-900 dark:text-white" dir="ltr">
            data<span className="text-emerald-600 dark:text-emerald-400">-dz</span>
          </span>
        </Link>

        {/* Grands écrans : tout est visible. Petits écrans : cloche + menu hamburger (le reste est dans le menu). */}
        <div className="flex items-center gap-1 lg:gap-2">
          <div className="hidden items-center gap-1 md:flex lg:gap-2">
            {session ? (
              <Button asChild size="sm" className="gap-2 bg-emerald-700 text-white shadow-sm hover:bg-emerald-800">
                <Link to={routes.proposer}>
                  <Plus className="h-4 w-4" />
                  {t("navbar.proposer")}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="text-xs lg:text-sm">
                <Link to={routes.catalogue}>{t("navbar.decouvrir")}</Link>
              </Button>
            )}
            {session && <LienModeration />}
          </div>
          {session && <ClocheNotifications />}
          <div className="hidden items-center gap-1 md:flex lg:gap-2">
            <LanguageSelector />
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("theme.basculer")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <div className="ms-1">
              <MenuUtilisateur />
            </div>
          </div>
          <MenuMobile theme={theme} basculerTheme={toggleTheme} />
        </div>
      </nav>
    </header>
  );
};
