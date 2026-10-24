import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const CLE_THEME = "theme";

/** Thème choisi (mémorisé), sinon thème actuel de la page, sinon réglage du système. */
function themeInitial(): Theme {
  try {
    const memorise = localStorage.getItem(CLE_THEME);
    if (memorise === "light" || memorise === "dark") return memorise;
  } catch {
    // Stockage indisponible (navigation privée…) : on se rabat sur le système.
  }
  if (document.documentElement.classList.contains("dark")) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(themeInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme((precedent) => {
      const suivant = precedent === "light" ? "dark" : "light";
      try {
        localStorage.setItem(CLE_THEME, suivant);
      } catch {
        // Le choix ne sera simplement pas mémorisé.
      }
      return suivant;
    });
  };

  return { theme, toggleTheme };
};
