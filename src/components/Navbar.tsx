import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect } from "react";

import { NavBar } from "./ui/tubelight-navbar";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "react-i18next";
import {
  faBook,
  faCode,
  faGlobe,
  faHome,
  faListDots,
  faPhone,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import JoinUsBtn from "./JoinUsBtn";
import { ThemeLanguageToggle } from "./ThemeLanguageToggle";
import { cn } from "@/lib/utils";
import { AnimatedGradientText } from "./ui/announcment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const weAreInDataPage =
    location.pathname === "/" || location.pathname.includes("/dataset");
  const weAreInApiPage = location.pathname.includes("/api");
  const weAreInGeoPage = location.pathname.includes("/geo");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest(".dropdown-menu")) {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const navItems = [
    { name: t("navbar.api"), url: "/api", icon: faCode },

    { name: t("navbar.data"), url: "/", icon: faBook },
    { name: t("geomatics"), url: "/geo", icon: faGlobe },

    {
      name: t("navbar.contact"),
      url: `mailto:admin@newalgeria.org?subject=${t(
        "joinUs.emailSubject"
      )}&body=${t("contact.body")}`,
      icon: faPhone,
    },
  ];

  if (weAreInApiPage) {
    return (
      <>
        <Link to="/api">
          <img
            src={`${import.meta.env.VITE_R2_BUCKET_URI}/logo/api-dz-logo.png`}
            alt="API DZ"
            className={`fixed ${
              isScrolled || !location.pathname.endsWith("/api")
                ? "top-0 left-0 -mt-5"
                : "top-1/4 left-1/2 transform -translate-x-1/2 w-40 -mt-8 md:w-80"
            } w-56 h-50 p-2 z-50  md:-mt-0`}
          />
        </Link>
        <ThemeLanguageToggle />
        <NavBar items={navItems} />
        <Announcment />
      </>
    );
  }

  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-40 border-b">
      <div className="container mx-auto px-2 h-16 flex items-center justify-between">
        {weAreInDataPage ? (
          <a href="/" className="text-2xl font-bold text-primary">
            <img
              src={`${
                import.meta.env.VITE_R2_BUCKET_URI
              }/logo/data-dz-logo-removebg.png`}
              alt="Data DZ"
              className="h-24 md:h-28 -ml-3 md:-ml-0"
            />
          </a>
        ) : (
          <a href="/geo" className="text-2xl font-bold text-primary">
            <img
              src={`${import.meta.env.VITE_R2_BUCKET_URI}/logo/geo-dz-logo.png`}
              alt="API DZ"
              className="h-16 md:h-22 -ml-3 md:-ml-0"
            />
          </a>
        )}

        <div className="flex items-center gap-4">
          {!weAreInDataPage && (
            <a
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-primary"
            >
              {t("navbar.data")}
            </a>
          )}
          {!weAreInApiPage && (
            <a
              href="/api"
              className="text-gray-600 dark:text-gray-300 hover:text-primary"
            >
              {t("navbar.api")}
            </a>
          )}
          {!weAreInGeoPage && (
            <a
              href="/geo"
              className="text-gray-600 dark:text-gray-300 hover:text-primary"
            >
              Geo
            </a>
          )}
          <div className="relative md:hidden dropdown-menu">
            <FontAwesomeIcon
              icon={faSliders}
              className="text-gray-600 dark:text-gray-300 hover:text-primary cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50">
                <div className="p-2">
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
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
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
          </div>
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
      href="https://rapidapi.com/new-algeria-new-algeria-default/api/api-dz/pricing"
      className="block w-full text-white z-50 fixed top-8 "
      target="_blank"
    >
      <div className="w-full md:w-auto text-white absolute top-0 left-1/2 transform -translate-x-1/2 mt-12 md:mt-20">
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
