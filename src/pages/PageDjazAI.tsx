import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  History,
  LoaderCircle,
  Lock,
  LogIn,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { Textarea } from "@/components/ui/textarea";
import { SOURCES_ACCUEIL, type SourceBandeau } from "@/components/accueil/sources-accueil";
import { HeroDjazAI } from "@/components/djazai/HeroDjazAI";
import { IndicateurReflexion, ReponseMarkdown, SourcesDjazAI } from "@/components/djazai/ContenuDjazAI";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { ErreurApi } from "@/lib/api";
import { ilYA } from "@/lib/carte-catalogue";
import {
  ajouterMessage,
  ecrireQuestionEnAttente,
  enregistrerConversations,
  historiquePourApi,
  lireConversations,
  lireQuestionEnAttente,
  nouvelIdentifiant,
  slugsRecents,
  stockageNavigateur,
  type ConversationDjazAI,
  type MessageConversation,
} from "@/lib/conversations-djazai";
import { chargerQuotaDjazAI, cleErreurDjazAI, interrogerDjazAI, peutPoser, quotaApresLimite, type QuotaDjazAI } from "@/lib/djazai";
import { avecSuite, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Ancre de la conversation (bouton du hero, retour après connexion). */
const ANCRE_CONVERSATION = "chat";
/** Durée de l'animation « je cherche » montrée à un visiteur avant la réponse verrouillée. */
const DUREE_REFLEXION_VISITEUR = 2600;

/** Motif d'étoiles à huit branches, discret, en fond de la section conversation (clin d'œil au zellige). */
const MOTIF_ZELLIGE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%23047857' stroke-width='1'%3E%3Cpath d='M28 8l6 14 14 6-14 6-6 14-6-14-14-6 14-6z'/%3E%3Crect x='18' y='18' width='20' height='20' transform='rotate(45 28 28)'/%3E%3C/g%3E%3C/svg%3E\")";

/** Réponse réservée aux membres : texte flouté (simples barres, aucun faux contenu) et invitation à se connecter. */
const ReponseVerrouillee = ({ suite }: { suite: string }) => {
  const { t } = useTranslation();
  return (
    <div className="relative isolate overflow-hidden rounded-2xl rounded-ss-md border border-border bg-card shadow-sm">
      {/* Fond : fausses lignes floutées qui remplissent toute la carte, sous l'invitation. */}
      <div className="absolute inset-0 -z-10 space-y-2.5 px-4 py-4 blur-[3px]" aria-hidden>
        {["w-11/12", "w-full", "w-4/5", "w-10/12", "w-2/3", "w-full", "w-3/4", "w-11/12", "w-1/2"].map((largeur, index) => (
          <div key={index} className={cn("h-3 rounded-full bg-gradient-to-r from-emerald-200 via-muted to-amber-100 dark:from-emerald-900/70 dark:via-muted dark:to-amber-900/40", largeur)} />
        ))}
        <div className="flex gap-2 pt-2">
          <div className="h-14 w-20 rounded-lg bg-emerald-100 dark:bg-emerald-950" />
          <div className="h-14 flex-1 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="flex justify-center bg-gradient-to-b from-card/30 via-card/75 to-card/95 px-4 py-6">
        <div className="max-w-sm text-center animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950 text-white shadow-lg dark:bg-white dark:text-neutral-950">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-base font-bold text-foreground">{t("pageDjazai.verrou.titre")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("pageDjazai.verrou.texte")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to={avecSuite(routes.connexion, suite)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {t("pageDjazai.verrou.seConnecter")}
            </Link>
            <Link
              to={avecSuite(routes.inscription, suite)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              {t("ia.creerCompte")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Une bulle de la conversation. */
const BulleMessage = ({ message, suite }: { message: MessageConversation; suite: string }) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <p dir="auto" className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-emerald-700 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
          {message.contenu}
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      <div className="flex w-full max-w-[94%] items-start gap-2.5 sm:max-w-[88%]">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          {message.verrouille ? (
            <ReponseVerrouillee suite={suite} />
          ) : message.erreur ? (
            <p className="rounded-2xl rounded-ss-md border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {message.contenu}
            </p>
          ) : (
            <div className="rounded-2xl rounded-ss-md border border-border bg-card px-4 py-3 text-sm leading-relaxed text-card-foreground shadow-sm">
              <ReponseMarkdown contenu={message.contenu} />
            </div>
          )}
          {message.sources && message.sources.length > 0 && <SourcesDjazAI sources={message.sources} />}
        </div>
      </div>
    </div>
  );
};

/** Une tuile du marquee : logo officiel s'il existe (public/sources/), sinon l'icône dans une pastille. */
const TuileSource = ({ source, copie }: { source: SourceBandeau; copie: boolean }) => {
  const { t } = useTranslation();
  const Icone = source.icone;
  return (
    <li className="shrink-0">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={copie ? -1 : undefined}
        className="group/tuile flex h-20 items-center gap-3 rounded-2xl border border-border bg-card px-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-600/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        {source.logo ? (
          <img src={source.logo} alt="" className="h-10 w-10 object-contain" loading="lazy" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Icone className="h-5 w-5" aria-hidden />
          </span>
        )}
        <span className="whitespace-nowrap text-base font-semibold text-foreground">{t(`accueil.sources.noms.${source.cle}`)}</span>
      </a>
    </li>
  );
};

/**
 * Sources sur lesquelles DjazAI s'appuie : le catalogue data-dz en tête, puis les sources du bandeau de l'accueil,
 * en tuiles qui défilent (deux copies, la seconde masquée ; sens inversé en arabe ; pause au survol ;
 * grille fixe avec « réduire les animations »).
 */
const SectionSources = () => {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="titre-sources-djazai" className="overflow-hidden border-y border-border bg-background py-12">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-8">
        <h2 id="titre-sources-djazai" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("pageDjazai.sources.titre")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{t("pageDjazai.sources.texte")}</p>
      </div>
      <div className="group mt-8 flex gap-[var(--gap)] [--duration:40s] [--gap:1rem] [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:[mask-image:none]">
        {[false, true].map((copie) => (
          <ul
            key={String(copie)}
            aria-hidden={copie || undefined}
            className={cn(
              "flex shrink-0 items-center gap-[var(--gap)] py-2 animate-marquee rtl:animate-marquee-rtl group-hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:shrink motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:px-4",
              copie && "motion-reduce:hidden",
            )}
          >
            <li className="shrink-0">
              <Link
                to={routes.catalogue}
                tabIndex={copie ? -1 : undefined}
                className="flex h-20 items-center gap-3 rounded-2xl bg-emerald-700 px-5 text-white shadow-md shadow-emerald-900/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <img src="/data_dz_logo_icon.png" alt="" className="h-10 w-10 rounded-xl bg-white/95 object-contain p-1" />
                <span className="flex flex-col leading-tight">
                  <span className="text-base font-extrabold">data-dz</span>
                  <span className="text-xs font-medium text-emerald-50/90">{t("pageDjazai.sources.catalogue")}</span>
                </span>
              </Link>
            </li>
            {SOURCES_ACCUEIL.map((source) => (
              <TuileSource key={source.cle} source={source} copie={copie} />
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
};

/**
 * Page DjazAI (`/djazai`) : hero animé, sources, puis une conversation en grand avec l'historique
 * gardé dans le navigateur. Membre connecté : vraie réponse de l'API (5 questions par jour, admin sans limite).
 * Visiteur : la question s'affiche et l'assistant « réfléchit », mais rien n'est envoyé ; la réponse
 * reste verrouillée derrière « Se connecter », et la question est reprise après la connexion.
 */
export default function PageDjazAI() {
  const { t } = useTranslation();
  const langue = useLangue();
  const { session, chargement: chargementAuth } = useAuth();
  const utilisateurId = session?.user.id ?? null;

  const [conversations, setConversations] = useState<ConversationDjazAI[]>([]);
  const [conversationId, setConversationId] = useState<string>(() => nouvelIdentifiant());
  const [question, setQuestion] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [etape, setEtape] = useState(0);
  const [quota, setQuota] = useState<QuotaDjazAI | null>(null);
  const [quotaEnCours, setQuotaEnCours] = useState(false);
  const [erreurQuota, setErreurQuota] = useState(false);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  /** Compte dont les conversations sont chargées : on n'écrit rien avant de les avoir lues. */
  const [chargeesPour, setChargeesPour] = useState<string | null | undefined>(undefined);

  const sectionRef = useRef<HTMLElement>(null);
  const filRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLTextAreaElement>(null);
  const minuteurVisiteur = useRef<number>();

  const suggestions = t("ia.suggestions", { returnObjects: true }) as string[];
  const etapes = t("ia.etapesChargement", { returnObjects: true }) as string[];
  const suite = `${routes.djazai}#${ANCRE_CONVERSATION}`;
  const conversation = conversations.find((element) => element.id === conversationId);
  const messages = conversation?.messages ?? [];
  const visiteur = !chargementAuth && !session;

  const versConversation = useCallback(() => {
    sectionRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    window.setTimeout(() => champRef.current?.focus({ preventScroll: true }), 500);
  }, []);

  // Conversations du compte (ou du visiteur), relues à chaque changement de compte.
  useEffect(() => {
    if (chargementAuth) return;
    setConversations(lireConversations(stockageNavigateur(), utilisateurId));
    setConversationId(nouvelIdentifiant());
    setChargeesPour(utilisateurId);
    setQuota(null);
    setErreurQuota(false);
    // Retour de connexion : la question posée en visiteur revient dans le champ.
    if (utilisateurId) {
      const enAttente = lireQuestionEnAttente(stockageNavigateur());
      if (enAttente) {
        setQuestion(enAttente);
        ecrireQuestionEnAttente(stockageNavigateur(), null);
        toast.success(t("pageDjazai.questionReprise"));
      }
    }
  }, [chargementAuth, utilisateurId, t]);

  useEffect(() => {
    if (chargeesPour === undefined || chargeesPour !== utilisateurId) return;
    enregistrerConversations(stockageNavigateur(), utilisateurId, conversations);
  }, [conversations, chargeesPour, utilisateurId]);

  // Arrivée sur #chat (retour de connexion, lien partagé) : directement à la conversation.
  useEffect(() => {
    if (window.location.hash === `#${ANCRE_CONVERSATION}`) {
      const minuteur = window.setTimeout(() => sectionRef.current?.scrollIntoView(), 200);
      return () => window.clearTimeout(minuteur);
    }
  }, []);

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
    if (chargementAuth || !utilisateurId) return;
    void rechargerQuota();
  }, [chargementAuth, utilisateurId, rechargerQuota]);

  useEffect(() => () => window.clearTimeout(minuteurVisiteur.current), []);

  // Le fil défile jusqu'au dernier message (sans faire défiler la page).
  useEffect(() => {
    const fil = filRef.current;
    if (fil) fil.scrollTo({ top: fil.scrollHeight, behavior: "smooth" });
  }, [messages.length, envoiEnCours]);

  useEffect(() => {
    if (!envoiEnCours) return;
    const minuteur = window.setInterval(() => setEtape((courante) => (courante + 1) % Math.max(etapes.length, 1)), 1300);
    return () => window.clearInterval(minuteur);
  }, [envoiEnCours, etapes.length]);

  // Le champ grandit avec le texte (8 rem au plus).
  useEffect(() => {
    const champ = champRef.current;
    if (!champ) return;
    champ.style.height = "auto";
    champ.style.height = `${Math.min(champ.scrollHeight, 128)}px`;
  }, [question]);

  const ajouter = (id: string, message: MessageConversation) =>
    setConversations((courantes) => ajouterMessage(courantes, id, message));

  const quotaEpuise = Boolean(session && quota && !peutPoser(quota));
  const champBloque = chargementAuth || envoiEnCours || (Boolean(session) && (quotaEnCours || erreurQuota || !quota || quotaEpuise));

  const envoyer = async (valeur: string) => {
    const texte = valeur.trim();
    if (!texte || champBloque) return;
    const id = conversationId;
    const historique = historiquePourApi(messages);
    const slugs = slugsRecents(messages);
    setQuestion("");
    setEtape(0);
    setEnvoiEnCours(true);
    ajouter(id, { id: nouvelIdentifiant(), role: "user", contenu: texte });

    // Visiteur : aucune requête, seulement l'animation, puis la réponse verrouillée.
    if (!session) {
      ecrireQuestionEnAttente(stockageNavigateur(), texte);
      minuteurVisiteur.current = window.setTimeout(() => {
        ajouter(id, { id: nouvelIdentifiant(), role: "assistant", contenu: "", verrouille: true });
        setEnvoiEnCours(false);
      }, DUREE_REFLEXION_VISITEUR);
      return;
    }

    try {
      const resultat = await interrogerDjazAI(texte, historique, slugs);
      setQuota(resultat.quota);
      ajouter(id, { id: nouvelIdentifiant(), role: "assistant", contenu: resultat.answer_markdown, sources: resultat.sources });
    } catch (erreur) {
      if (erreur instanceof ErreurApi && erreur.code === "assistant_daily_limit") setQuota((courant) => quotaApresLimite(courant, erreur));
      if (erreur instanceof ErreurApi && erreur.code === "assistant_quota_unavailable") setErreurQuota(true);
      ajouter(id, { id: nouvelIdentifiant(), role: "assistant", contenu: t(cleErreurDjazAI(erreur)), erreur: true });
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const soumettre = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void envoyer(question);
  };

  const toucheQuestion = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void envoyer(question);
    }
  };

  const nouvelleConversation = () => {
    if (envoiEnCours) return;
    setConversationId(nouvelIdentifiant());
    setQuestion("");
    setHistoriqueOuvert(false);
    champRef.current?.focus();
  };

  const ouvrirConversation = (id: string) => {
    if (envoiEnCours) return;
    setConversationId(id);
    setHistoriqueOuvert(false);
  };

  const supprimerConversation = (id: string) => {
    if (envoiEnCours) return;
    setConversations((courantes) => courantes.filter((element) => element.id !== id));
    if (id === conversationId) setConversationId(nouvelIdentifiant());
  };

  const toutEffacer = () => {
    if (envoiEnCours || !window.confirm(t("pageDjazai.historique.confirmerEffacer"))) return;
    setConversations([]);
    setConversationId(nouvelIdentifiant());
  };

  const listeConversations = (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={nouvelleConversation}
        disabled={envoiEnCours}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-neutral-950"
      >
        <MessageSquarePlus className="h-4 w-4" aria-hidden />
        {t("ia.nouvelle")}
      </button>
      <p className="mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("pageDjazai.historique.titre")}</p>
      {conversations.length === 0 ? (
        <p className="mt-2 px-1 text-sm text-muted-foreground">{t("pageDjazai.historique.vide")}</p>
      ) : (
        <ul className="mt-2 space-y-1 overflow-y-auto lg:max-h-[52vh]">
          {conversations.map((element) => (
            <li key={element.id} className="group relative">
              <button
                type="button"
                onClick={() => ouvrirConversation(element.id)}
                aria-current={element.id === conversationId ? "true" : undefined}
                className={cn(
                  "w-full rounded-lg py-2 pe-9 ps-3 text-start transition-colors hover:bg-muted",
                  element.id === conversationId && "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
                )}
              >
                <span dir="auto" className="block truncate text-sm font-medium">{element.titre || t("ia.nouvelle")}</span>
                <span className="block text-xs text-muted-foreground">{ilYA(element.misAJourLe, langue)}</span>
              </button>
              <button
                type="button"
                onClick={() => supprimerConversation(element.id)}
                aria-label={t("pageDjazai.historique.supprimer", { titre: element.titre })}
                className="absolute end-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-70 transition hover:bg-background hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {conversations.length > 0 && (
        <button type="button" onClick={toutEffacer} className="mt-3 px-1 text-start text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">
          {t("pageDjazai.historique.toutEffacer")}
        </button>
      )}
      <p className="mt-auto px-1 pt-4 text-[11px] leading-snug text-muted-foreground">{t("pageDjazai.historique.local")}</p>
    </div>
  );

  return (
    <>
      <CustomMetaTags title={t("pageDjazai.metaTitre")} description={t("pageDjazai.metaDescription")} path={routes.djazai} />
      <Navbar />
      <main>
        <HeroDjazAI versConversation={versConversation} />
        <SectionSources />

        <section
          ref={sectionRef}
          id={ANCRE_CONVERSATION}
          aria-labelledby="titre-conversation-djazai"
          className="relative scroll-mt-16 bg-muted/40 py-10 sm:py-14"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]" style={{ backgroundImage: MOTIF_ZELLIGE }} aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="titre-conversation-djazai" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {t("pageDjazai.conversation.titre")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("pageDjazai.conversation.texte")}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoriqueOuvert((ouvert) => !ouvert)}
                aria-expanded={historiqueOuvert}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm lg:hidden"
              >
                <History className="h-4 w-4" aria-hidden />
                {t("pageDjazai.historique.bouton", { count: conversations.length })}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside
                aria-label={t("pageDjazai.historique.titre")}
                className={cn("rounded-2xl border border-border bg-card p-3 shadow-sm lg:block", historiqueOuvert ? "block" : "hidden")}
              >
                {listeConversations}
              </aside>

              <div className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-xl shadow-emerald-950/5">
                {/* Liseré vert, blanc, rouge en haut du panneau. */}
                <div className="flex h-1.5" aria-hidden>
                  <span className="flex-1 bg-[#006233]" />
                  <span className="flex-1 bg-white dark:bg-neutral-200" />
                  <span className="w-10 bg-[#d21034]" />
                </div>

                <div
                  ref={filRef}
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions text"
                  className="h-[min(62vh,620px)] min-h-[380px] space-y-5 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6"
                >
                  {chargementAuth ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                      <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" aria-hidden />
                      {t("ia.verificationConnexion")}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
                      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white shadow-lg shadow-emerald-900/20">
                        <Sparkles className="h-7 w-7" aria-hidden />
                      </span>
                      <p className="text-lg font-bold text-foreground">{t("ia.bienvenue")}</p>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                        {visiteur ? t("pageDjazai.conversation.accueilVisiteur") : t("ia.premiere")}
                      </p>
                      {session && erreurQuota && !quotaEnCours ? (
                        <button type="button" onClick={() => void rechargerQuota()} className="mt-5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">
                          {t("ia.reessayer")}
                        </button>
                      ) : (
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => void envoyer(suggestion)}
                              disabled={champBloque}
                              className="rounded-full border border-border bg-card px-3.5 py-2 text-start text-sm text-foreground shadow-sm transition-colors hover:border-emerald-600/50 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/40"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    messages.map((message) => <BulleMessage key={message.id} message={message} suite={suite} />)
                  )}
                  {envoiEnCours && (
                    <div className="flex justify-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white">
                        <Sparkles className="h-4 w-4 animate-pulse motion-reduce:animate-none" aria-hidden />
                      </span>
                      <IndicateurReflexion etape={etapes[etape] ?? t("ia.chargement")} />
                    </div>
                  )}
                </div>

                <div className="border-t border-border bg-card/60 px-3 pb-3 pt-3 sm:px-5">
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                    {visiteur ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                        {t("pageDjazai.conversation.reserve")}
                      </span>
                    ) : quota ? (
                      <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                        {quota.is_admin ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden /> : <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />}
                        {quota.is_admin ? t("ia.quotaAdmin") : t("ia.quotaRestante", { count: quota.remaining ?? 0 })}
                      </span>
                    ) : quotaEnCours ? (
                      <span>{t("ia.verificationQuota")}</span>
                    ) : erreurQuota ? (
                      <span role="alert" className="text-amber-700 dark:text-amber-300">{t("ia.quotaIndisponible")}</span>
                    ) : null}
                  </div>
                  {quotaEpuise && (
                    <p role="status" className="mb-2 rounded-lg bg-muted px-3 py-2 text-center text-sm text-muted-foreground">{t("ia.quotaAtteint")}</p>
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
                      disabled={champBloque}
                      className="min-h-[48px] max-h-32 resize-none overflow-y-auto rounded-3xl border-border bg-background px-4 py-3 text-base leading-6 shadow-sm focus-visible:ring-emerald-600"
                    />
                    <button
                      type="submit"
                      aria-label={t("ia.envoyer")}
                      disabled={champBloque || !question.trim()}
                      className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:bg-white dark:text-neutral-950"
                    >
                      {envoiEnCours ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5 rtl:-scale-x-100" aria-hidden />}
                    </button>
                  </form>
                  <p className="mt-2 px-1 text-center text-[11px] leading-snug text-muted-foreground">{t("ia.avertissement")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
