import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Search, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexte/ContexteAuth";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./LanguageSelector";
import { MenuUtilisateur } from "./auth/MenuUtilisateur";
import { ClocheNotifications } from "./communaute/ClocheNotifications";
import { MenuMobile } from "./MenuMobile";
import { RechercheNavbar } from "./RechercheNavbar";
import ICONE_DATA_DZ from "@/assets/img/data_dz_logo_icon.png";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { pathname } = useLocation();
  const surPageApi = pathname === routes.api;
  const [defile, setDefile] = useState(false);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

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
      <nav className="container mx-auto flex h-16 items-center justify-between gap-2 px-4" aria-label="data-dz">
        <div className="flex shrink-0 items-center gap-2" dir="ltr">
          <Link to={routes.accueil} className="group flex shrink-0 items-center gap-2.5" aria-label="data-dz">
            <img
              src={ICONE_DATA_DZ}
              alt=""
              className="h-9 w-9 transition-transform duration-500 group-hover:rotate-[20deg]"
            />
            <span className="whitespace-nowrap text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              data<span className="text-emerald-600 dark:text-emerald-400">-dz</span>
            </span>
          </Link>
          {/* Sur la page API : « data-dz / API », en violet comme tout ce qui touche à l'API. */}
          {surPageApi && (
            <Link to={routes.api} className="whitespace-nowrap text-xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
              <span className="font-light text-gray-400 dark:text-gray-500">/</span> API
            </Link>
          )}
        </div>

        {/* Grands écrans : grande recherche (résultats en dessous) au centre. */}
        <div className="mx-4 hidden max-w-xl flex-1 md:block lg:mx-8">
          <RechercheNavbar />
        </div>

        {/* À droite : langue (grand écran), thème, cloche, compte. Petits écrans : loupe, thème, cloche, avatar ou hamburger. */}
        <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setRechercheOuverte(true)} aria-label={t("navbar.rechercher")}>
            <Search className="h-5 w-5" />
          </Button>
          <div className="hidden md:block">
            <LanguageSelector />
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("theme.basculer")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {session && <ClocheNotifications />}
          <div className="ms-1 hidden md:block">
            <MenuUtilisateur />
          </div>
          <MenuMobile theme={theme} basculerTheme={toggleTheme} />
        </div>
      </nav>

      {/* Petits écrans : la loupe ouvre la recherche en haut de l'écran, résultats en dessous. */}
      <Dialog open={rechercheOuverte} onOpenChange={setRechercheOuverte}>
        <DialogContent className="top-3 max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 rounded-2xl p-3 pr-12 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
          <DialogTitle className="sr-only">{t("navbar.rechercher")}</DialogTitle>
          <DialogDescription className="sr-only">{t("navbar.rechercheDescription")}</DialogDescription>
          <RechercheNavbar autoFocus onTermine={() => setRechercheOuverte(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
};
