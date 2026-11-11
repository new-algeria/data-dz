import { useCallback, useEffect, useRef } from "react";
import { ArrowDown, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DrapeauAlgerie } from "@/components/DrapeauAlgerie";
import { BLEU_DJAZAI } from "@/lib/sections";
import { ScenePilule } from "./ScenePilule";

/** Durée de l'ouverture de la pilule, comme dans la maquette d'origine. */
const DUREE_OUVERTURE = 2100;
const COURBE = "cubic-bezier(0.7, 0, 0.2, 1)";
/** Téléphone : mots empilés, la pilule s'ouvre en hauteur. */
const REQUETE_TELEPHONE = "(max-width: 720px)";

/**
 * Images clés de la pilule (en em, relatifs à la taille du mot) :
 * trait fin → fente à 30 % → cercle à 58 % → pilule finale ; le découpage s'ouvre depuis le milieu
 * et un voile gris se dissipe entre 14 et 30 %.
 */
function imagesCles(telephone: boolean) {
  if (telephone) {
    return {
      pilule: [
        { height: "0.012em", clipPath: "inset(0 50% round 999px)", offset: 0 },
        { height: "0.1em", clipPath: "inset(0 30% round 999px)", offset: 0.3 },
        { height: "0.62em", clipPath: "inset(0 0% round 999px)", offset: 0.58 },
        { height: "1.1em", clipPath: "inset(0 0% round 999px)", offset: 1 },
      ],
    };
  }
  return {
    pilule: [
      { width: "0.012em", clipPath: "inset(50% 0 round 999px)", offset: 0 },
      { width: "0.1em", clipPath: "inset(30% 0 round 999px)", offset: 0.3 },
      { width: "0.84em", clipPath: "inset(0% 0 round 999px)", offset: 0.58 },
      { width: "1.68em", clipPath: "inset(0% 0 round 999px)", offset: 1 },
    ],
  };
}

const VOILE = [
  { opacity: 1, offset: 0 },
  { opacity: 1, offset: 0.14 },
  { opacity: 0, offset: 0.3 },
  { opacity: 0, offset: 1 },
];

/**
 * Hero de la page DjazAI : le mot « DJAZ AI » s'écarte sur un trait fin qui s'ouvre en pilule
 * (scène du Sahara au coucher du soleil). Fond papier avec de longues courbes blanches, bandeau du haut
 * qui descend, pied qui monte (paragraphe avec lettrine, filet, bouton noir). Une seule chronologie
 * Web Animations de 2,1 s, rejouable ; « réduire les animations » montre directement l'état final.
 */
export const HeroDjazAI = ({ versConversation }: { versConversation: () => void }) => {
  const { t } = useTranslation();
  const piluleRef = useRef<HTMLSpanElement>(null);
  const voileRef = useRef<HTMLSpanElement>(null);
  const animationsRef = useRef<Animation[]>([]);

  const lancer = useCallback(() => {
    const pilule = piluleRef.current;
    const voile = voileRef.current;
    if (!pilule || !voile || typeof pilule.animate !== "function") return;
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { pilule: images } = imagesCles(window.matchMedia(REQUETE_TELEPHONE).matches);
    const options: KeyframeAnimationOptions = { duration: DUREE_OUVERTURE, easing: COURBE, fill: "both" };
    animationsRef.current = [pilule.animate(images, options), voile.animate(VOILE, { ...options, easing: "linear" })];
  }, []);

  useEffect(() => {
    lancer();
    // Passage ordinateur ↔ téléphone : la pilule ne s'ouvre pas dans le même sens, on repart de l'état final.
    const requete = window.matchMedia(REQUETE_TELEPHONE);
    const auChangement = () => {
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
    };
    requete.addEventListener("change", auChangement);
    return () => {
      requete.removeEventListener("change", auChangement);
      animationsRef.current.forEach((animation) => animation.cancel());
    };
  }, [lancer]);

  /** Rejouer : la pilule se referme (lecture à l'envers, plus vite), puis se rouvre. */
  const rejouer = async () => {
    const animations = animationsRef.current;
    if (animations.length === 0) {
      lancer();
      return;
    }
    try {
      animations.forEach((animation) => { animation.playbackRate = -1.8; animation.play(); });
      await Promise.all(animations.map((animation) => animation.finished));
      animations.forEach((animation) => { animation.playbackRate = 1; animation.play(); });
    } catch {
      // Animation annulée entre-temps (changement de page ou de format) : rien à faire.
    }
  };

  return (
    <section
      aria-labelledby="titre-djazai"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-16 bg-[#f2f2f1] text-neutral-950 dark:bg-[#0c1210] dark:text-neutral-50"
    >
      {/* Longues courbes en S, blanches sur le papier (très discrètes en sombre). */}
      <svg
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-white dark:text-white/[0.06]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        focusable="false"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M -80 ${140 + i * 120} C 280 ${20 + i * 120}, 520 ${380 + i * 120}, 760 ${230 + i * 120} S 1220 ${60 + i * 120}, 1540 ${260 + i * 120}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={i % 2 === 0 ? 2.2 : 1.2}
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Bandeau du haut, qui descend. */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 pt-5 animate-in fade-in slide-in-from-top-6 duration-700 motion-reduce:animate-none sm:px-8">
        <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <DrapeauAlgerie className="h-4 w-6 rounded-[2px] shadow-sm" titre={t("drapeau")} />
          {t("pageDjazai.surTitre")}
        </span>
        <span className="rounded-full border border-neutral-950/15 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-white/15 dark:text-neutral-300">
          {t("pageDjazai.badge")}
        </span>
      </div>

      {/* Le mot. Toujours de gauche à droite (c'est un nom), y compris en arabe. */}
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <h1
          id="titre-djazai"
          dir="ltr"
          aria-label="DjazAI"
          className="flex select-none flex-col items-center font-extrabold leading-[0.9] [font-family:Inter,ui-sans-serif,system-ui,sans-serif] [font-size:min(19.6vh,24vw)] [letter-spacing:-0.045em] min-[721px]:flex-row min-[721px]:[font-size:min(19.6vh,13.2vw)]"
        >
          <span aria-hidden>DJAZ</span>
          <span
            ref={piluleRef}
            aria-hidden
            className="relative mx-[0.06em] my-[0.08em] block h-[1.1em] w-[2.3em] overflow-hidden rounded-full bg-neutral-300 [clip-path:inset(0_round_999px)] dark:bg-neutral-800 min-[721px]:my-0 min-[721px]:h-[0.84em] min-[721px]:w-[1.68em]"
          >
            <ScenePilule />
            <span ref={voileRef} className="absolute inset-0 bg-neutral-400 opacity-0 dark:bg-neutral-700" />
          </span>
          <span aria-hidden style={{ color: BLEU_DJAZAI }}>AI</span>
        </h1>
      </div>

      {/* Pied, qui monte : paragraphe avec lettrine, filet, bouton noir. */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 [animation-delay:400ms] [animation-fill-mode:both] motion-reduce:animate-none sm:px-8 sm:pb-8">
        <div className="h-px w-full bg-neutral-950/20 dark:bg-white/15" />
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <p className="max-w-xl text-[15px] leading-relaxed text-neutral-700 ltr:first-letter:float-start ltr:first-letter:me-2 ltr:first-letter:mt-1 ltr:first-letter:text-5xl ltr:first-letter:font-extrabold ltr:first-letter:leading-[0.8] ltr:first-letter:text-neutral-950 dark:text-neutral-300 ltr:dark:first-letter:text-white sm:text-base">
            {t("pageDjazai.intro")}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void rejouer()}
              aria-label={t("pageDjazai.rejouer")}
              title={t("pageDjazai.rejouer")}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-950/20 text-neutral-800 transition-colors hover:bg-neutral-950/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 motion-reduce:hidden dark:border-white/20 dark:text-neutral-200 dark:hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={versConversation}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 motion-reduce:transition-none dark:bg-white dark:text-neutral-950"
            >
              {t("pageDjazai.commencer")}
              <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
