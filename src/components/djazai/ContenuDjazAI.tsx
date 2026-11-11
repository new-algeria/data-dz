import { ExternalLink, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import type { SourceDjazAI } from "@/lib/djazai";
import { routes } from "@/lib/routes";
import { BLEU_DJAZAI, LOGO_DJAZAI } from "@/lib/sections";
import { cn } from "@/lib/utils";

function dateLisible(dateTexte: string | null, langue: string): string | null {
  if (!dateTexte) return null;
  const date = new Date(dateTexte);
  if (Number.isNaN(date.getTime())) return dateTexte;
  return date.toLocaleDateString(langue, { day: "numeric", month: "short", year: "numeric" });
}

/** Réponse de DjazAI en Markdown (HTML brut désactivé, liens dans un nouvel onglet). */
export const ReponseMarkdown = ({ contenu }: { contenu: string }) => (
  <div dir="auto" className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-2 prose-a:text-emerald-800 prose-a:underline prose-a:underline-offset-2 dark:prose-a:text-emerald-300 prose-li:my-0">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => href
          ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          : <>{children}</>,
      }}
    >
      {contenu}
    </ReactMarkdown>
  </div>
);

/** Fiches citées par une réponse : illustration, formats, source, date, version, licence. */
export const SourcesDjazAI = ({ sources, onOuvrir }: { sources: SourceDjazAI[]; onOuvrir?: () => void }) => {
  const { t, i18n } = useTranslation();
  if (sources.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("ia.sources")}</p>
      {sources.map((source, index) => {
        const date = dateLisible(source.mis_a_jour_le, i18n.resolvedLanguage ?? "fr");
        return (
          <article
            key={source.id}
            className="animate-in fade-in slide-in-from-bottom-1 rounded-xl border border-border bg-card p-3 text-start shadow-sm duration-300 motion-reduce:animate-none"
            style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
          >
            <Link
              to={routes.donnee(source.id)}
              onClick={onOuvrir}
              className="group flex items-start gap-3 text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
            >
              <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-emerald-50 dark:bg-emerald-950/60 sm:h-16 sm:w-24">
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-emerald-700/60 dark:text-emerald-300/60" aria-hidden />
                {source.image_url && (
                  <img
                    src={source.image_url}
                    alt={t("ia.apercuDataset", { titre: source.titre })}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug">{source.titre}</span>
                {source.formats && source.formats.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {source.formats.slice(0, 4).map((format) => (
                      <span key={format} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {format}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            </Link>
            {source.source_nom && <p className="mt-2 text-xs text-muted-foreground">{t("ia.source")}: {source.source_nom}</p>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {date && <span>{t("ia.misAJour")}: {date}</span>}
              {source.version && <span>{t("ia.version")}: {source.version}</span>}
              {source.licence_code && (
                source.licence_url
                  ? <a href={source.licence_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t("ia.licence")}: {source.licence_code}</a>
                  : <span>{t("ia.licence")}: {source.licence_code}</span>
              )}
            </div>
            {source.source_url && (
              <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
                {t("ia.sourceOfficielle")}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
};

/** Trois points qui rebondissent et l'étape en cours (« Je parcours le catalogue… »). */
export const IndicateurReflexion = ({ etape }: { etape: string }) => (
  <div className="flex items-center gap-3 rounded-2xl rounded-ss-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm" role="status">
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-700 [animation-delay:-0.24s] motion-reduce:animate-none" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.12s] motion-reduce:animate-none" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 motion-reduce:animate-none" />
    </span>
    <span key={etape} className="animate-in fade-in duration-300">{etape}</span>
  </div>
);

/** Logo bleu de DjazAI, utilisé comme avatar de l'assistant (bulle, page, indicateur). */
export const AvatarDjazAI = ({ className, anime = false }: { className?: string; anime?: boolean }) => (
  <img
    src={LOGO_DJAZAI}
    alt=""
    aria-hidden
    className={cn("shrink-0 select-none object-contain", anime && "animate-pulse motion-reduce:animate-none", className ?? "h-8 w-8")}
  />
);

/** « DjazAI », avec « AI » dans le bleu de la section. */
export const NomDjazAI = ({ className }: { className?: string }) => (
  <span className={className} dir="ltr">
    Djaz<span style={{ color: BLEU_DJAZAI }}>AI</span>
  </span>
);
