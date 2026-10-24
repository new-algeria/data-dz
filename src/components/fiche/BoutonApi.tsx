import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { urlApiDonnee } from "@/lib/api";

/** Affiche l'URL de la donnée dans l'API publique et la copie au clic. */
export const BoutonApi = ({ slug }: { slug: string }) => {
  const { t } = useTranslation();
  const [copie, setCopie] = useState(false);
  const url = urlApiDonnee(slug);

  useEffect(() => {
    if (!copie) return;
    const minuteur = window.setTimeout(() => setCopie(false), 2000);
    return () => window.clearTimeout(minuteur);
  }, [copie]);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      toast.success(t("api.copiee"));
    } catch {
      toast.error(t("api.copieImpossible"));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={copier}
      title={t("api.copier")}
      aria-label={`${t("api.copier")} : ${url}`}
      className="h-auto max-w-full justify-start gap-2.5 border-violet-500/40 bg-violet-50/80 px-3 py-2 text-violet-900 backdrop-blur hover:bg-violet-100 hover:text-violet-950 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20 dark:hover:text-violet-100 lg:max-w-[22rem]"
    >
      <span className="shrink-0 rounded-md bg-violet-600 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white dark:bg-violet-500">
        API
      </span>
      <code className="min-w-0 flex-1 truncate text-start font-mono text-xs" dir="ltr">
        {url}
      </code>
      {copie ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : <Copy className="h-4 w-4 shrink-0 opacity-70" aria-hidden />}
    </Button>
  );
};
