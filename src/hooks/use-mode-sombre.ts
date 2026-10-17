import { useEffect, useState } from "react";

const estSombre = () => document.documentElement.classList.contains("dark");

/** Suit la classe `dark` posée sur <html> par le bouton de thème. */
export function useModeSombre(): boolean {
  const [sombre, setSombre] = useState(estSombre);

  useEffect(() => {
    const observateur = new MutationObserver(() => setSombre(estSombre()));
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observateur.disconnect();
  }, []);

  return sombre;
}
