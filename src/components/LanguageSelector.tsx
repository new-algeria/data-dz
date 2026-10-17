import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLangue } from "@/hooks/use-langue";

// Noms et abréviations écrits dans leur propre langue : ils ne se traduisent pas.
const langues = [
  { code: "fr", nom: "Français", court: "FR" },
  { code: "en", nom: "English", court: "EN" },
  { code: "ar", nom: "العربية", court: "ع" },
];

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const langueCourante = useLangue();
  const courante = langues.find((langue) => langue.code === langueCourante) ?? langues[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2.5" aria-label={t("langue.choisir")}>
          <Languages className="h-4 w-4" />
          <span className="text-xs font-semibold" lang={courante.code}>
            {courante.court}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("langue.choisir")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {langues.map((langue) => (
          <DropdownMenuItem
            key={langue.code}
            lang={langue.code}
            onSelect={() => i18n.changeLanguage(langue.code)}
            className="justify-between gap-4"
          >
            {langue.nom}
            {langue.code === langueCourante && <Check className="h-4 w-4 text-emerald-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
