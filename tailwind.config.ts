import type { Config } from "tailwindcss";
import type { PluginAPI } from "tailwindcss/types/config";
import flowbite from "flowbite-react/tailwind";
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    flowbite.content(),
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      animation: {
        gradient: "gradient 8s linear infinite",
        rainbow: "rainbow var(--speed, 2s) infinite linear",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-rtl": "marquee-rtl var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        aurora: "aurora 60s linear infinite",
        flotter: "flotter 18s ease-in-out infinite",
        "flotter-lent": "flotter 26s ease-in-out infinite reverse",
        halo: "halo 6s ease-in-out infinite",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Couleurs des composants shadcn (menus, listes déroulantes, cartes) : sans elles,
        // bg-popover et bg-card ne produisaient aucune classe et les menus étaient transparents.
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        primary: {
          DEFAULT: "#0D573EFF",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        // Variables CSS (clair et sombre) : un gris clair codé en dur donnait des survols blancs en mode sombre.
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground))",
        },
        "color-1": "hsl(var(--color-1))",
        "color-2": "hsl(var(--color-2))",
        "color-3": "hsl(var(--color-3))",
        "color-4": "hsl(var(--color-4))",
        "color-5": "hsl(var(--color-5))",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "inherit",
            a: {
              color: "inherit",
              textDecoration: "none",
              fontWeight: "500",
            },
            '[class~="lead"]': {
              color: "inherit",
            },
            strong: {
              color: "inherit",
            },
            "ul > li::before": {
              backgroundColor: "currentColor",
            },
            hr: {
              borderColor: "currentColor",
              opacity: 0.3,
            },
            blockquote: {
              color: "inherit",
              borderLeftColor: "currentColor",
            },
            h1: {
              color: "inherit",
            },
            h2: {
              color: "inherit",
            },
            h3: {
              color: "inherit",
            },
            h4: {
              color: "inherit",
            },
            "figure figcaption": {
              color: "inherit",
            },
            code: {
              color: "inherit",
            },
            "a code": {
              color: "inherit",
            },
            pre: {
              color: "currentColor",
              backgroundColor: "rgb(0 0 0 / 0.1)",
            },
            thead: {
              color: "inherit",
              borderBottomColor: "currentColor",
            },
            "tbody tr": {
              borderBottomColor: "currentColor",
            },
          },
        },
      },
      keyframes: {
        flotter: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(6%, -8%) scale(1.08)" },
          "66%": { transform: "translate(-5%, 6%) scale(0.95)" },
        },
        halo: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.05)" },
        },
        gradient: {
          to: {
            backgroundPosition: "var(--bg-size) 0",
          },
        },
        rainbow: {
          "0%": { "background-position": "0%" },
          "100%": { "background-position": "200%" },
        },
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
        "aurora-border": {
          "0%, 100%": { borderRadius: "37% 29% 27% 27% / 28% 25% 41% 37%" },
          "25%": { borderRadius: "47% 29% 39% 49% / 61% 19% 66% 26%" },
          "50%": { borderRadius: "57% 23% 47% 72% / 63% 17% 66% 33%" },
          "75%": { borderRadius: "28% 49% 29% 100% / 93% 20% 64% 25%" },
        },
        "aurora-1": {
          "0%, 100%": { top: "0", right: "0" },
          "50%": { top: "50%", right: "25%" },
          "75%": { top: "25%", right: "50%" },
        },
        "aurora-2": {
          "0%, 100%": { top: "0", left: "0" },
          "60%": { top: "75%", left: "25%" },
          "85%": { top: "50%", left: "50%" },
        },
        "aurora-3": {
          "0%, 100%": { bottom: "0", left: "0" },
          "40%": { bottom: "50%", left: "25%" },
          "65%": { bottom: "25%", left: "50%" },
        },
        marquee: {
          from: {
            transform: "translateX(0)",
          },
          to: {
            transform: "translateX(calc(-100% - var(--gap)))",
          },
        },
        // En arabe (RTL), la copie est à gauche : la bande défile vers la droite.
        "marquee-rtl": {
          from: {
            transform: "translateX(0)",
          },
          to: {
            transform: "translateX(calc(100% + var(--gap)))",
          },
        },
        "marquee-vertical": {
          from: {
            transform: "translateY(0)",
          },
          to: {
            transform: "translateY(calc(-100% - var(--gap)))",
          },
        },
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },

        "aurora-4": {
          "0%, 100%": {
            bottom: "0",
            right: "0",
          },
          "50%": {
            bottom: "25%",
            right: "40%",
          },
          "90%": {
            bottom: "50%",
            right: "25%",
          },
        },
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    typography,
    addVariablesForColors,
    flowbite.plugin(),
  ],
} satisfies Config;

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }: PluginAPI) {
  const allColors = flattenColorPalette(theme("colors"));
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}
