import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";

type ChampMotDePasseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/** Champ mot de passe avec un bouton pour afficher ou masquer la saisie. */
export const ChampMotDePasse = forwardRef<HTMLInputElement, ChampMotDePasseProps>((props, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    // Un mot de passe s'écrit toujours de gauche à droite, même en arabe : champ et bouton dans le même sens.
    <div className="relative" dir="ltr">
      <Input ref={ref} type={visible ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setVisible((precedent) => !precedent)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? t("auth.masquerMotDePasse") : t("auth.afficherMotDePasse")}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
ChampMotDePasse.displayName = "ChampMotDePasse";
