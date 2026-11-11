import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Expand, LoaderCircle, LogIn, RotateCcw, Send, ShieldCheck, UserPlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { AvatarDjazAI, IndicateurReflexion, NomDjazAI, ReponseMarkdown, SourcesDjazAI } from "@/components/djazai/ContenuDjazAI";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ErreurApi } from "@/lib/api";
import { useAuth } from "@/contexte/ContexteAuth";
import { historiquePourApi, slugsRecents } from "@/lib/conversations-djazai";
import { chargerQuotaDjazAI, cleErreurDjazAI, interrogerDjazAI, quotaApresLimite, type QuotaDjazAI, type SourceDjazAI } from "@/lib/djazai";
import { avecSuite, routes } from "@/lib/routes";

type Message = {
  id: string;
  role: "user" | "assistant";
  contenu: string;
  sources?: SourceDjazAI[];
  erreur?: boolean;
};

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
  const [etapeChargement, setEtapeChargement] = useState(0);
  const [quota, setQuota] = useState<QuotaDjazAI | null>(null);
  const [quotaEnCours, setQuotaEnCours] = useState(false);
  const [erreurQuota, setErreurQuota] = useState(false);
  const finMessagesRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLTextAreaElement>(null);
  const utilisateurId = session?.user.id;
  const suggestions = t("ia.suggestions", { returnObjects: true }) as string[];
  const etapesChargement = t("ia.etapesChargement", { returnObjects: true }) as string[];

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
    setMessages([]);
    setQuestion("");
    setQuota(null);
    setErreurQuota(false);
  }, [utilisateurId]);

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

  useEffect(() => {
    if (!envoiEnCours) return;
    const timer = window.setInterval(() => {
      setEtapeChargement((courante) => (courante + 1) % Math.max(etapesChargement.length, 1));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [envoiEnCours, etapesChargement.length]);

  const texteErreur = (erreur: unknown) => t(cleErreurDjazAI(erreur));

  const envoyerQuestion = async (valeur: string) => {
    const texte = valeur.trim();
    if (!texte || envoiEnCours || !session || chargementAuth || quotaEnCours || erreurQuota || !quota) return;
    if (!quota.is_admin && (quota.remaining ?? 0) < 1) return;

    const historique = historiquePourApi(messages);
    const slugsPrecedents = slugsRecents(messages);

    setQuestion("");
    setEtapeChargement(0);
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
        setQuota((courant) => quotaApresLimite(courant, erreur));
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

  // Sur ordinateur, le curseur va dans le champ dès que la conversation est prête (quota vérifié).
  const pret = ouverte && Boolean(session) && Boolean(quota) && !quotaEnCours && !erreurQuota;
  useEffect(() => {
    if (!pret || !window.matchMedia("(min-width: 640px)").matches) return;
    const minuteur = window.setTimeout(() => champRef.current?.focus(), 50);
    return () => window.clearTimeout(minuteur);
  }, [pret]);

  // Le champ grandit avec le texte (jusqu'à 8 rem, puis il défile) et revient à une ligne après l'envoi.
  useEffect(() => {
    const champ = champRef.current;
    if (!champ) return;
    champ.style.height = "auto";
    champ.style.height = `${Math.min(champ.scrollHeight, 128)}px`;
  }, [question]);

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

  // La page DjazAI a sa propre conversation en grand : pas de bulle par-dessus.
  if (emplacement.pathname === routes.djazai) return null;

  return (
    <div className={`fixed bottom-4 end-4 z-40 sm:bottom-6 sm:end-6 ${ouverte ? "pointer-events-none opacity-0" : ""}`}>
      <Dialog open={ouverte} onOpenChange={setOuverte}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={t("ia.bouton")}
            className="group relative flex items-center gap-2 rounded-full border border-[#2f80ed]/25 bg-card p-1.5 text-base font-bold tracking-tight text-foreground shadow-lg shadow-blue-900/15 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed] motion-reduce:transition-none sm:pe-4"
          >
            <AvatarDjazAI className="h-9 w-9 transition-transform duration-500 group-hover:rotate-[20deg] motion-reduce:transition-none" />
            <NomDjazAI className="hidden sm:inline" />
          </button>
        </DialogTrigger>

        {/* Téléphone : plein écran, comme une appli de messagerie. À partir de « sm » : fenêtre centrée.
            La croix par défaut du Dialog est masquée : la nôtre est dans l'en-tête (bien placée aussi en arabe). */}
        <DialogContent
          dir={i18n.dir()}
          onOpenAutoFocus={(event) => {
            // Pas de focus automatique sur la croix ; sur téléphone, pas de clavier qui cacherait les suggestions (voir `pret`).
            event.preventDefault();
          }}
          className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-2xl data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 sm:h-[min(760px,calc(100dvh-3rem))] sm:w-[min(860px,calc(100vw-3rem))] sm:max-w-[860px] sm:rounded-3xl sm:border sm:border-border [&>button:last-child]:hidden"
        >
          {/* En-tête compact : une seule ligne sur téléphone (≈ 56 px), titre complet et description à partir de « sm ». */}
          <DialogHeader className="shrink-0 space-y-0 border-b border-border bg-background px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] text-start text-foreground sm:px-6 sm:py-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <AvatarDjazAI className="h-8 w-8 sm:h-10 sm:w-10" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex items-center gap-2 text-start text-base font-bold leading-tight tracking-tight text-foreground sm:text-xl">
                  <NomDjazAI className="truncate" />
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 text-start text-xs text-muted-foreground sm:mt-0.5 sm:text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f80ed]" aria-hidden />
                  <span className="truncate sm:hidden">{t("ia.enDeveloppement")}</span>
                  <span className="hidden truncate sm:inline">{t("ia.descriptionChat")}</span>
                </DialogDescription>
              </div>
              {/* Actions de l'en-tête : nouvelle conversation (dès qu'il y a des messages) et fermer. */}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setMessages([]); setQuestion(""); }}
                  disabled={envoiEnCours}
                  aria-label={t("ia.nouvelle")}
                  title={t("ia.nouvelle")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed] disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-medium"
                >
                  <RotateCcw className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
                  <span className="hidden sm:inline">{t("ia.nouvelle")}</span>
                </button>
              )}
              <Link
                to={routes.djazai}
                onClick={() => setOuverte(false)}
                aria-label={t("ia.pleinePage")}
                title={t("ia.pleinePage")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
              >
                <Expand className="h-4 w-4" aria-hidden />
              </Link>
              <DialogClose
                aria-label={t("ia.fermer")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
              >
                <X className="h-5 w-5" aria-hidden />
              </DialogClose>
            </div>
          </DialogHeader>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted/30 px-3 py-4 sm:space-y-5 sm:px-7 sm:py-5"
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
            ) : messages.length === 0 && (quotaEnCours || (!quota && !erreurQuota)) ? (
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
                <AvatarDjazAI className="mb-4 h-16 w-16" />
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
                <div key={message.id} className={(message.role === "user" ? "flex justify-end" : "flex justify-start") + " animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"}>
                  <div className={message.role === "user" ? "max-w-[88%] rounded-2xl rounded-ee-md bg-emerald-700 px-4 py-3 text-white shadow-sm" : "max-w-[94%] space-y-3 sm:max-w-[88%]"}>
                    {message.role === "assistant" && (
                      <div className="flex items-start gap-2.5">
                        <AvatarDjazAI className="mt-0.5 h-7 w-7" />
                        <div className={message.erreur ? "rounded-2xl rounded-ss-md border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" : "min-w-0 rounded-2xl rounded-ss-md border border-border bg-card px-4 py-3 text-sm leading-relaxed text-card-foreground shadow-sm"}>
                          {message.erreur ? (
                            <p>{message.contenu}</p>
                          ) : (
                            <ReponseMarkdown contenu={message.contenu} />
                          )}
                        </div>
                      </div>
                    )}

                    {message.role === "user" && <p dir="auto" className="whitespace-pre-wrap text-sm leading-relaxed">{message.contenu}</p>}

                    {message.sources && message.sources.length > 0 && (
                      <div className="ms-9">
                        <SourcesDjazAI sources={message.sources} onOuvrir={() => setOuverte(false)} />
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
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                <IndicateurReflexion etape={etapesChargement[etapeChargement] ?? t("ia.chargement")} />
              </div>
            )}
            <div ref={finMessagesRef} />
          </div>

          {session && (
          <div className="shrink-0 border-t border-border bg-background px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-5 sm:pb-3 sm:pt-3">
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
                ref={champRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={toucheQuestion}
                placeholder={t("ia.question")}
                aria-label={t("ia.question")}
                maxLength={1200}
                rows={1}
                disabled={envoiEnCours || chargementAuth || quotaEnCours || erreurQuota || !quota || (!quota.is_admin && (quota.remaining ?? 0) === 0)}
                className="min-h-[44px] max-h-32 resize-none overflow-y-auto rounded-3xl border-border bg-card px-4 py-2.5 text-base leading-6 shadow-sm focus-visible:ring-emerald-600"
              />
              <button
                type="submit"
                aria-label={t("ia.envoyer")}
                disabled={envoiEnCours || !question.trim() || chargementAuth || quotaEnCours || erreurQuota || !quota || (!quota.is_admin && (quota.remaining ?? 0) === 0)}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {envoiEnCours ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
              </button>
            </form>
            <p className="mt-1.5 px-1 text-center text-[10px] leading-snug text-muted-foreground sm:mt-2 sm:text-[11px]">{t("ia.avertissement")}</p>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
