import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import DATA_DZ_LOGO from "../assets/img/data_dz_logo.png";
import { NavBar } from "./ui/tubelight-navbar";
import {
  faBook,
  faCode,
  faHome,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Items pour la navigation conditionnelle
  const navItems = [
    { name: "Accueil API", url: "/api", icon: faCode },
    //{ name: "API", url: "/api", icon: faCode },
    { name: "Data", url: "/", icon: faBook },
    { name: "Contact", url: "/contact", icon: faPhone },
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
            Accueil
          </Link>
          <Link
            to="/api"
            className="text-gray-600 dark:text-gray-300 hover:text-primary"
          >
            API
          </Link>
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
            <Link to="/getting-started">Commencer</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
