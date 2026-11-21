import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Musique de fond de la balade. Fichier libre de droits hébergé sur R2 (`web-assets/audio/balade.mp3`) :
 * tant qu'il n'existe pas, le bouton reste caché. Ne jamais y mettre un morceau protégé (voir CLAUDE.md).
 */
export const URL_MUSIQUE_BALADE = `${(import.meta.env.VITE_URL_FICHIERS ?? "https://files.data-dz.com").replace(/\/+$/, "")}/web-assets/audio/balade.mp3`;

const CLE_SON = "data-dz:balade:son";
const VOLUME = 0.35;
const FONDU_MS = 2000;

const lireCoupe = () => {
  try {
    return localStorage.getItem(CLE_SON) === "off";
  } catch {
    return false;
  }
};

/**
 * Lecture en boucle avec fondus. Les navigateurs bloquent le son sans geste du visiteur : la musique démarre au
 * premier geste (molette, clic, toucher, touche), sauf si le visiteur l'a coupée (choix mémorisé). Pause quand
 * l'onglet est caché.
 */
export function useMusiqueBalade() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fondu = useRef(0);
  const [disponible, setDisponible] = useState(false);
  const [coupe, setCoupe] = useState(lireCoupe);
  const coupeRef = useRef(coupe);
  coupeRef.current = coupe;

  const fondre = useCallback((cible: number, ensuite?: () => void) => {
    const element = audio.current;
    if (!element) return;
    cancelAnimationFrame(fondu.current);
    const depart = element.volume;
    const debut = performance.now();
    const pas = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / FONDU_MS);
      element.volume = depart + (cible - depart) * t;
      if (t < 1) fondu.current = requestAnimationFrame(pas);
      else ensuite?.();
    };
    fondu.current = requestAnimationFrame(pas);
  }, []);

  const jouer = useCallback(() => {
    const element = audio.current;
    if (!element || coupeRef.current) return;
    element.volume = element.paused ? 0 : element.volume;
    element
      .play()
      .then(() => fondre(VOLUME))
      .catch(() => undefined);
  }, [fondre]);

  const arreter = useCallback(() => {
    const element = audio.current;
    if (!element || element.paused) return;
    fondre(0, () => element.pause());
  }, [fondre]);

  useEffect(() => {
    const element = new Audio();
    element.src = URL_MUSIQUE_BALADE;
    element.loop = true;
    element.preload = "auto";
    element.volume = 0;
    const pret = () => setDisponible(true);
    element.addEventListener("canplay", pret, { once: true });
    audio.current = element;

    const premierGeste = () => {
      jouer();
      retirer();
    };
    const gestes = ["pointerdown", "wheel", "keydown", "touchstart"] as const;
    const retirer = () => gestes.forEach((g) => window.removeEventListener(g, premierGeste));
    gestes.forEach((g) => window.addEventListener(g, premierGeste, { passive: true }));

    const surVisibilite = () => {
      if (document.hidden) element.pause();
      else if (!coupeRef.current && element.currentTime > 0) jouer();
    };
    document.addEventListener("visibilitychange", surVisibilite);

    return () => {
      retirer();
      document.removeEventListener("visibilitychange", surVisibilite);
      cancelAnimationFrame(fondu.current);
      element.pause();
      element.removeAttribute("src");
      element.load();
      audio.current = null;
    };
  }, [jouer]);

  const basculer = useCallback(() => {
    const nouveau = !coupeRef.current;
    coupeRef.current = nouveau;
    setCoupe(nouveau);
    try {
      localStorage.setItem(CLE_SON, nouveau ? "off" : "on");
    } catch {
      // Stockage bloqué : le choix vaut pour cette visite.
    }
    if (nouveau) arreter();
    else jouer();
  }, [arreter, jouer]);

  return { disponible, coupe, basculer, arreter };
}
