import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Moon, Sun } from "lucide-react";
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
import JoinUsBtn from "./JoinUsBtn";
import { ThemeLanguageToggle } from "./ThemeLanguageToggle";
import { cn } from "@/lib/utils";
import { AnimatedGradientText } from "./ui/announcment";

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
    return (
      <>
        <ThemeLanguageToggle />
        <NavBar items={navItems} />
        <Announcment />
      </>
    );
  }

  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-40 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="text-2xl font-bold text-primary">
          <img src={DATA_DZ_LOGO} alt="Data DZ" className="h-20" />
        </a>
        <div className="flex items-center gap-2">
          {/* <a
            href="/"
            className="text-gray-600 dark:text-gray-300 hover:text-primary"
          >
            {t("navbar.home")}
          </a> */}
          <a
            href="/api"
            className="text-gray-600 dark:text-gray-300 hover:text-primary"
          >
            {t("navbar.api")}
          </a>
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
          <JoinUsBtn />
        </div>
      </div>
    </nav>
  );
};

export const Announcment = () => {
  const { t } = useTranslation();
  return (
    <a
      href="https://rapidapi.com/Newalgeria/api/api-dz/pricing"
      className="fixed top-20 w-full text-white z-50"
      target="_blank"
    >
      <div className="fixed top-12 w-full text-white z-50 flex items-center justify-center py-2 md:top-20 ">
        <AnimatedGradientText>
          🎉 <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300" />{" "}
          <span
            className={cn(
              `inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`
            )}
          >
            {t("70-sur-notre-api-pour-louverture")}{" "}
          </span>
          <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
        </AnimatedGradientText>
      </div>
    </a>
  );
};
