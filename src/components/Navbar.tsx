import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Sun, SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect } from "react";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "react-i18next";
import JoinUsBtn from "./JoinUsBtn";
import LOGO_DATA_DZ from "@/assets/img/data_dz_logo.png";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    if (!menuOuvert) return;
    const fermerMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(".dropdown-menu")) {
        setMenuOuvert(false);
      }
    };
    const fermerAuDefilement = () => setMenuOuvert(false);

    document.addEventListener("click", fermerMenu);
    window.addEventListener("scroll", fermerAuDefilement);
    return () => {
      document.removeEventListener("click", fermerMenu);
      window.removeEventListener("scroll", fermerAuDefilement);
    };
  }, [menuOuvert]);

  const boutonTheme = (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("theme.basculer")}>
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );

  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-40 border-b">
      <div className="container mx-auto px-2 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">
          <img src={LOGO_DATA_DZ} alt="data-dz" className="h-20 md:h-24" />
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-primary">
            {t("navbar.catalogue")}
          </Link>
          <a
            href={`mailto:admin@newalgeria.org?subject=${encodeURIComponent(t("contact.sujet"))}&body=${encodeURIComponent(t("contact.corps"))}`}
            className="hidden sm:inline text-gray-600 dark:text-gray-300 hover:text-primary"
          >
            {t("navbar.contact")}
          </a>
          <div className="relative md:hidden dropdown-menu">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("navbar.menu")}
              aria-expanded={menuOuvert}
              onClick={() => setMenuOuvert(!menuOuvert)}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
            {menuOuvert && (
              <div className="absolute end-0 mt-2 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50">
                <div className="p-2 flex items-center gap-2">
                  <LanguageSelector />
                  {boutonTheme}
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <LanguageSelector />
            {boutonTheme}
          </div>
          <JoinUsBtn />
        </div>
      </div>
    </nav>
  );
};
