import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import DATA_DZ_LOGO from "../assets/img/data_dz_logo.png";
import { NavBar } from "./ui/tubelight-navbar";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "react-i18next";
import {
  faBook,
  faCode,
  faHome,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { name: t("navbar.api"), url: "/api", icon: faCode },
    { name: t("navbar.data"), url: "/", icon: faBook },
    { name: t("navbar.contact"), url: "/contact", icon: faPhone },
  ];

  if (location.pathname.includes("/api")) {
    return <NavBar items={navItems} />;
  }

  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">
          <img src={DATA_DZ_LOGO} alt="Data DZ" className="h-20" />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-gray-600 dark:text-gray-300 hover:text-primary"
          >
            {t("navbar.home")}
          </Link>
          <Link
            to="/api"
            className="text-gray-600 dark:text-gray-300 hover:text-primary"
          >
            {t("navbar.api")}
          </Link>
          <LanguageSelector />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="mr-4"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button variant="default" className="bg-primary text-white">
            <Link to="/getting-started">{t("navbar.getStarted")}</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
