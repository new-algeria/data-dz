import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Le fennec, mascotte de New Algeria, assis sur le bord haut du pied de page.
 * Il surgit de derrière la bordure quand le pied de page arrive à l'écran, et sautille au survol.
 * Purement décoratif (aria-hidden) ; avec « réduire les animations », il est simplement posé là.
 * Même composant sur New Algeria (même image, même animation).
 */
export const MascottePied = () => {
  const cadre = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = cadre.current;
    if (!element) return;
    // Visible dès que son niveau est atteint ou dépassé : un défilement rapide (ou un saut tout en bas,
    // quand le pied de page est plus haut que l'écran sur mobile) ne le laisse jamais caché.
    const verifier = () => {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
        setVisible(true);
        window.removeEventListener("scroll", verifier);
        window.removeEventListener("resize", verifier);
      }
    };
    verifier();
    window.addEventListener("scroll", verifier, { passive: true });
    window.addEventListener("resize", verifier, { passive: true });
    return () => {
      window.removeEventListener("scroll", verifier);
      window.removeEventListener("resize", verifier);
    };
  }, []);

  return (
    <div className="pointer-events-none relative mx-auto h-0 max-w-6xl" aria-hidden="true">
      {/* Le cadre coupe l'image au ras de la bordure : le fennec semble sortir de derrière. */}
      <div ref={cadre} className="absolute bottom-0 start-6 h-[124px] w-[96px] overflow-hidden sm:start-10 md:h-[164px] md:w-[124px]">
        <img
          src="/mascotte/fennec.webp"
          alt=""
          width={261}
          height={360}
          loading="lazy"
          decoding="async"
          className={cn(
            "pointer-events-auto absolute bottom-0 left-1/2 h-[112px] w-auto -translate-x-1/2 select-none drop-shadow-sm transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2 md:h-[150px]",
            "motion-reduce:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            visible ? "translate-y-0" : "translate-y-[105%]"
          )}
          draggable={false}
        />
      </div>
    </div>
  );
};
