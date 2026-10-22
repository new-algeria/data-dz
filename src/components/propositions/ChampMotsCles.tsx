import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";

const MAX_MOTS_CLES = 20;

interface ChampMotsClesProps {
  id: string;
  valeur: string[];
  onChange: (motsCles: string[]) => void;
}

/** Mots-clés en étiquettes : Entrée ou virgule pour ajouter, retour arrière pour retirer le dernier. */
export const ChampMotsCles = ({ id, valeur, onChange }: ChampMotsClesProps) => {
  const { t } = useTranslation();
  const [saisie, setSaisie] = useState("");

  const ajouter = (texte: string) => {
    const nouveaux = texte
      .split(",")
      .map((mot) => mot.trim().toLowerCase().slice(0, 40))
      .filter((mot) => mot && !valeur.includes(mot));
    if (nouveaux.length) onChange([...valeur, ...nouveaux].slice(0, MAX_MOTS_CLES));
    setSaisie("");
  };

  const surTouche = (evenement: KeyboardEvent<HTMLInputElement>) => {
    if (evenement.key === "Enter" || evenement.key === ",") {
      evenement.preventDefault();
      ajouter(saisie);
    } else if (evenement.key === "Backspace" && !saisie && valeur.length) {
      onChange(valeur.slice(0, -1));
    }
  };

  return (
    <div className="rounded-md border border-input bg-background p-1.5 focus-within:ring-2 focus-within:ring-ring">
      <ul className="flex flex-wrap gap-1.5">
        {valeur.map((mot) => (
          <li key={mot} className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-sm text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
            {mot}
            <button type="button" onClick={() => onChange(valeur.filter((m) => m !== mot))} aria-label={t("propositions.champs.retirerMotCle", { mot })}>
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        <li className="min-w-[8rem] flex-1">
          <Input
            id={id}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={surTouche}
            onBlur={() => saisie.trim() && ajouter(saisie)}
            placeholder={valeur.length ? "" : t("propositions.champs.motsClesExemple")}
            className="h-7 border-0 px-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={valeur.length >= MAX_MOTS_CLES}
          />
        </li>
      </ul>
    </div>
  );
};
