/**
 * Confettis aux couleurs de l'Algérie quand un membre lance un téléchargement depuis le site.
 * canvas-confetti n'est chargé qu'au premier téléchargement ; rien avec « réduire les animations ».
 */
export const COULEURS_CONFETTIS = ["#006233", "#10b981", "#ffffff", "#d21034", "#34d399"];

export const animationsReduites = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export async function feterTelechargement(): Promise<void> {
  if (animationsReduites()) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    const commun = { colors: COULEURS_CONFETTIS, zIndex: 9999, disableForReducedMotion: true, ticks: 220 };
    // Deux gerbes depuis les coins bas, puis une pluie au centre.
    confetti({ ...commun, particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.9 } });
    confetti({ ...commun, particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.9 } });
    window.setTimeout(() => confetti({ ...commun, particleCount: 90, spread: 100, startVelocity: 30, origin: { x: 0.5, y: 0.35 } }), 250);
  } catch {
    // Module introuvable (ancien onglet après un déploiement) : pas de fête, le téléchargement continue.
  }
}
