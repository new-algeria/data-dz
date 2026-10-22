import { useRef, useState, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TYPES_FICHIER } from "@/lib/soumissions";
import { cn } from "@/lib/utils";

const EXTENSIONS_ACCEPTEES = Object.keys(TYPES_FICHIER).map((extension) => `.${extension}`).join(",");

/** Zone de dépôt : glisser-déposer ou clic pour choisir des fichiers. */
export const ZoneDepot = ({ surFichiers, desactive = false }: { surFichiers: (fichiers: File[]) => void; desactive?: boolean }) => {
  const { t } = useTranslation();
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);

  const deposer = (evenement: DragEvent) => {
    evenement.preventDefault();
    setSurvol(false);
    if (!desactive) surFichiers([...evenement.dataTransfer.files]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!desactive) setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={deposer}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        survol ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-gray-300 dark:border-white/15",
        desactive && "opacity-50"
      )}
    >
      <UploadCloud className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <button
        type="button"
        onClick={() => champ.current?.click()}
        disabled={desactive}
        className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline disabled:cursor-not-allowed dark:text-emerald-400"
      >
        {t("propositions.champs.deposer")}
      </button>
      <p className="text-xs text-muted-foreground">{t("propositions.champs.fichiersAide")}</p>
      <input
        ref={champ}
        type="file"
        multiple
        accept={EXTENSIONS_ACCEPTEES}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          surFichiers([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
};
