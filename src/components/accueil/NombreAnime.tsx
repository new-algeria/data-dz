import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { formaterNombre } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";

/** Nombre qui défile de 0 à `valeur` quand il devient visible. */
export const NombreAnime = ({ valeur }: { valeur: number }) => {
  const langue = useLangue();
  const reference = useRef<HTMLSpanElement>(null);
  const visible = useInView(reference, { once: true });
  const mouvementReduit = useReducedMotion();
  const [affiche, setAffiche] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (mouvementReduit) {
      setAffiche(valeur);
      return;
    }
    const animation = animate(0, valeur, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (courant) => setAffiche(Math.round(courant)),
    });
    return () => animation.stop();
  }, [visible, valeur, mouvementReduit]);

  return (
    <span ref={reference} className="tabular-nums">
      {formaterNombre(affiche, langue)}
    </span>
  );
};
