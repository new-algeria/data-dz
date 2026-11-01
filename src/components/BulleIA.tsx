import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ExternalLink, LoaderCircle, LogIn, RotateCcw, Send, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useLocation } from "react-router-dom";
import { DrapeauAlgerie } from "@/components/DrapeauAlgerie";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ErreurApi } from "@/lib/api";
import { useAuth } from "@/contexte/ContexteAuth";
import { chargerQuotaDjazAI, interrogerDjazAI, type MessageDjazAI, type QuotaDjazAI, type SourceDjazAI } from "@/lib/djazai";
import { avecSuite, routes } from "@/lib/routes";

type Message = {
  id: string;
  role: "user" | "assistant";
  contenu: string;
  sources?: SourceDjazAI[];
  erreur?: boolean;
};

function dateLisible(dateTexte: string | null, langue: string): string | null {
  if (!dateTexte) return null;
  const date = new Date(dateTexte);
  if (Number.isNaN(date.getTime())) return dateTexte;
  return date.toLocaleDateString(langue, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Assistant DjazAI disponible depuis toutes les pages : le bouton flottant ouvre une conversation
 * éphémère avec réponses Markdown et fiches sources consultables.
 */
export const BulleIA = () => {
  const { t, i18n } = useTranslation();
  const { session, chargement: chargementAuth } = useAuth();
  const emplacement = useLocation();
  const [ouverte, setOuverte] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [quota, setQuota] = useState<QuotaDjazAI | null>(null);
  const [quotaEnCours, setQuotaEnCours] = useState(false);
  const [erreurQuota, setErreurQuota] = useState(false);
  const finMessagesRef = useRef<HTMLDivElement>(null);
  const suggestions = t("ia.suggestions", { returnObjects: true }) as string[];

  const rechargerQuota = useCallback(async () => {
    setQuotaEnCours(true);
    setErreurQuota(false);
    try {
      setQuota(await chargerQuotaDjazAI());
    } catch {
      setErreurQuota(true);
    } finally {
      setQuotaEnCours(false);
    }
  }, []);

  useEffect(() => {
    if (!ouverte || chargementAuth) return;
    if (!session) {
      setQuota(null);
      setErreurQuota(false);
      setQuotaEnCours(false);
      return;
    }
    void rechargerQuota();
  }, [ouverte, chargementAuth, session, rechargerQuota]);

  useEffect(() => {
    if (ouverte) finMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, envoiEnCours, ouverte]);

  const texteErreur = (erreur: unknown) => {
    if (erreur instanceof ErreurApi) {
      if (erreur.code === "assistant_unconfigured") return t("ia.erreurConfiguration");
      if (erreur.code === "assistant_daily_limit") return t("ia.quotaAtteint");
      if (erreur.code === "assistant_quota_unavailable") return t("ia.quotaIndisponible");
      if (erreur.code === "authentication_required") return t("ia.sessionExpiree");
      if (erreur.code === "assistant_capacity" || erreur.code === "rate_limited" || erreur.statut === 429 || erreur.statut === 503) {
        return t("ia.erreurLimite");
      }
    }
    return t("ia.erreurGenerique");
  };

  const envoyerQuestion = async (valeur: string) => {
    const texte = valeur.trim();
    if (!texte || envoiEnCours || !session || chargementAuth || quotaEnCours || erreurQuota || !quota) return;
    if (!quota.is_admin && (quota.remaining ?? 0) < 1) return;

    const historique: MessageDjazAI[] = messages
      .filter((message) => !message.erreur)
      .map((message) => ({ role: message.role, content: message.contenu }))
      .slice(-8);
    const slugsPrecedents = [...new Set(
      messages
        .slice()
        .reverse()
        .flatMap((message) => message.role === "assistant" ? (message.sources ?? []).map((source) => source.id) : [])
    )].slice(0, 4);

    setQuestion("");
    setEnvoiEnCours(true);
    setMessages((courants) => [...courants, { id: String(Date.now()) + "-user", role: "user", contenu: texte }]);

    try {
      const resultat = await interrogerDjazAI(texte, historique, slugsPrecedents);
      setQuota(resultat.quota);
      setMessages((courants) => [
        ...courants,
        { id: String(Date.now()) + "-assistant", role: "assistant", contenu: resultat.answer_markdown, sources: resultat.sources },
      ]);
    } catch (erreur) {
      if (erreur instanceof ErreurApi && erreur.code === "assistant_daily_limit") {
        const details = erreur.details as { remaining?: number; resets_at?: string } | undefined;
        setQuota((courant) => courant ? { ...courant, remaining: details?.remaining ?? 0, resets_at: details?.resets_at ?? courant.resets_at } : {
          is_admin: false, daily_limit: 5, remaining: 0, resets_at: details?.resets_at ?? null,
        });
      }
      if (erreur instanceof ErreurApi && erreur.code === "assistant_quota_unavailable") setErreurQuota(true);
      setMessages((courants) => [
        ...courants,
        { id: String(Date.now()) + "-error", role: "assistant", contenu: texteErreur(erreur), erreur: true },
      ]);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const soumettre = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void envoyerQuestion(question);
  };

  const toucheQuestion = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void envoyerQuestion(question);
    }
  };

  return (
    <div className="fixed bottom-4 end-4 z-40 sm:bottom-6 sm:end-6">
      <Dialog open={ouverte} onOpenChange={setOuverte}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={t("ia.bouton")}
            className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-700 to-teal-600 p-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 ring-1 ring-white/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 motion-reduce:transition-none sm:py-2.5 sm:pe-4 sm:ps-3"
          >
            <Sparkles className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">{t("ia.libelle")}</span>
          </button>
        </DialogTrigger>

        <DialogContent
          dir={i18n.dir()}
          className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-3xl border-border bg-background p-0 shadow-2xl sm:h-[min(760px,calc(100dvh-3rem))] sm:w-[min(860px,calc(100vw-3rem))]"
        >
          <DialogHeader className="shrink-0 bg-gradient-to-br from-emerald-700 to-teal-600 px-5 pb-4 pt-5 text-start text-white sm:px-7">
            <div className="flex items-center gap-3 pe-8">
              <DrapeauAlgerie className="h-8 w-12 shrink-0 rounded-sm shadow-sm" titre={t("drapeau")} />
              <div className="min-w-0">
                <DialogTitle className="text-start text-xl font-bold text-white">{t("ia.titre")}</DialogTitle>
                <DialogDescription className="mt-1 text-start text-emerald-50">{t("ia.descriptionChat")}</DialogDescription>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-50">
              <span className="h-2 w-2 rounded-full bg-lime-300" aria-hidden />
              {t("ia.enDeveloppement")}
            </div>
          </DialogHeader>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-muted/30 px-4 py-5 sm:px-7"
          >
            {chargementAuth ? (
              <div className="flex min-h-full items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" aria-hidden />
                {t("ia.verificationConnexion")}
              </div>
            ) : !session ? (
              <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center py-8 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <LogIn className="h-7 w-7" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold text-foreground">{t("ia.connexionRequise")}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("ia.connexionExplication")}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link
                    to={avecSuite(routes.connexion, `${emplacement.pathname}${emplacement.search}`)}
                    onClick={() => setOuverte(false)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
                  >
                    <LogIn className="h-4 w-4" aria-hidden />
                    {t("ia.seConnecter")}
                  </Link>
                  <Link
                    to={avecSuite(routes.inscription, `${emplacement.pathname}${emplacement.search}`)}
                    onClick={() => setOuverte(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    {t("ia.creerCompte")}
                  </Link>
                </div>
              </div>
            ) : messages.length === 0 && quotaEnCours ? (
              <div className="flex min-h-full items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" aria-hidden />
                {t("ia.verificationQuota")}
              </div>
            ) : messages.length === 0 && erreurQuota ? (
              <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center py-8 text-center">
                <h2 className="text-lg font-semibold text-foreground">{t("ia.quotaIndisponible")}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("ia.quotaErreurAide")}</p>
                <button type="button" onClick={() => void rechargerQuota()} className="mt-5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">
                  {t("ia.reessayer")}
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center py-6 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <Sparkles className="h-7 w-7" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold text-foreground">{t("ia.bienvenue")}</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t("ia.premiere")}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void envoyerQuestion(suggestion)}
                      disabled={envoiEnCours || quotaEnCours || !quota || (!quota.is_admin && (quota.remaining ?? 0) === 0)}
                      className="rounded-full border border-border bg-card px-3.5 py-2 text-start text-sm text-foreground shadow-sm transition-colors hover:border-emerald-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user" ? "max-w-[88%] rounded-2xl rounded-ee-md bg-emerald-700 px-4 py-3 text-white shadow-sm" : "max-w-[94%] space-y-3 sm:max-w-[88%]"}>
                    {message.role === "assistant" && (
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700 to-teal-600 text-white">
                          <Sparkles className="h-4 w-4" aria-hidden />
                        </span>
                        <div className={message.erreur ? "rounded-2xl rounded-ss-md border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" : "min-w-0 rounded-2xl rounded-ss-md border border-border bg-card px-4 py-3 text-sm leading-relaxed text-card-foreground shadow-sm"}>
                          {message.erreur ? (
                            <p>{message.contenu}</p>
                          ) : (
                            <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-2 prose-a:text-emerald-800 prose-a:underline prose-a:underline-offset-2 dark:prose-a:text-emerald-300 prose-li:my-0">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({ href, children }) => href
                                    ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                                    : <>{children}</>,
                                }}
                              >
                                {message.contenu}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {message.role === "user" && <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.contenu}</p>}

                    {message.sources && message.sources.length > 0 && (
                      <div className="ms-9 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("ia.sources")}</p>
                        {message.sources.map((source) => {
                          const date = dateLisible(source.mis_a_jour_le, i18n.resolvedLanguage ?? "fr");
                          return (
                            <article key={source.id} className="rounded-xl border border-border bg-card p-3 text-start shadow-sm">
                              <Link
                                to={routes.donnee(source.id)}
                                onClick={() => setOuverte(false)}
                                className="flex items-start justify-between gap-2 text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
                              >
                                <span>{source.titre}</span>
                                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                              </Link>
                              {source.source_nom && <p className="mt-1 text-xs text-muted-foreground">{t("ia.source")}: {source.source_nom}</p>}
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
                    )}
                  </div>
                </div>
              ))
            )}

            {session && quota && (
              <div role="status" className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                {quota.is_admin ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden /> : <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />}
                {quota.is_admin ? t("ia.quotaAdmin") : t("ia.quotaRestante", { count: quota.remaining ?? 0 })}
              </div>
            )}
            {session && quotaEnCours && messages.length > 0 && <p className="text-center text-xs text-muted-foreground">{t("ia.verificationQuota")}</p>}
            {envoiEnCours && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-ss-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  <LoaderCircle className="h-4 w-4 animate-spin text-emerald-700 motion-reduce:animate-none" aria-hidden />
                  {t("ia.chargement")}
                </div>
              </div>
            )}
            <div ref={finMessagesRef} />
          </div>

          {session && (
          <div className="shrink-0 border-t border-border bg-background px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => { setMessages([]); setQuestion(""); }}
                disabled={envoiEnCours}
                className="mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("ia.nouvelle")}
              </button>
            )}
            {!quotaEnCours && erreurQuota && (
              <p role="alert" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                {t("ia.quotaIndisponible")}
              </p>
            )}
            {!quotaEnCours && quota && !quota.is_admin && quota.remaining === 0 && (
              <p role="status" className="mb-2 rounded-lg bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                {t("ia.quotaAtteint")}
              </p>
            )}
            <form onSubmit={soumettre} className="flex items-end gap-2">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={toucheQuestion}
                placeholder={t("ia.question")}
                aria-label={t("ia.question")}
                maxLength={1200}
                rows={2}
                disabled={envoiEnCours}
                className="min-h-[44px] max-h-32 resize-none rounded-2xl border-border bg-card px-4 py-3 text-base shadow-sm focus-visible:ring-emerald-600"
              />
              <button
                type="submit"
                aria-label={t("ia.envoyer")}
                disabled={envoiEnCours || !question.trim()}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {envoiEnCours ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
              </button>
            </form>
            <p className="mt-2 px-1 text-center text-[11px] leading-relaxed text-muted-foreground">{t("ia.avertissement")}</p>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
