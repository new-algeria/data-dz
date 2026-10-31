import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DrapeauAlgerie } from "@/components/DrapeauAlgerie";

/**
 * Bouton « IA » flottant en bas à droite (à gauche en arabe), sur tout le site : un clic ouvre une bulle
 * qui annonce l'assistant IA en cours de développement. Rien n'est encore branché.
 */
export const BulleIA = () => {
  const { t, i18n } = useTranslation();
  const [ouverte, setOuverte] = useState(false);

  return (
    <div className="fixed bottom-4 end-4 z-40 sm:bottom-6 sm:end-6">
      <Popover open={ouverte} onOpenChange={setOuverte}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("ia.bouton")}
            // Téléphone : simple rond (il ne doit pas cacher les boutons de la page) ; texte à partir de « sm ».
            className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 p-3 text-sm font-semibold sm:py-2.5 sm:pe-4 sm:ps-3 text-white shadow-lg shadow-emerald-900/25 ring-1 ring-white/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 motion-reduce:transition-none"
          >
            <Sparkles className="h-5 w-5 animate-pulse motion-reduce:animate-none" aria-hidden />
            <span className="hidden sm:inline">{t("ia.libelle")}</span>
            <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white dark:ring-gray-900 sm:hidden" aria-hidden />
            <span className="hidden rounded-full bg-white/20 px-2 py-0.5 sm:inline text-[11px] font-medium uppercase tracking-wide">{t("ia.bientot")}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align={i18n.dir() === "rtl" ? "start" : "end"}
          sideOffset={12}
          className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl"
        >
          <div className="relative overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-500 px-5 pb-4 pt-5 text-white">
              <button
                type="button"
                onClick={() => setOuverte(false)}
                aria-label={t("ia.fermer")}
                className="absolute end-3 top-3 rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300 motion-reduce:animate-none" aria-hidden />
                {t("ia.enDeveloppement")}
              </span>
              <p className="mt-3 flex items-center gap-2 text-lg font-bold leading-snug">
                <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
                {t("ia.titre")}
              </p>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <p className="flex items-start gap-2 font-medium">
                <DrapeauAlgerie className="mt-0.5 h-4 w-6 shrink-0 rounded-sm" titre={t("drapeau")} />
                {t("ia.premiere")}
              </p>
              <p className="text-muted-foreground">{t("ia.description")}</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
