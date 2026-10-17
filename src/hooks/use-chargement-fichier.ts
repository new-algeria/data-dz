import { useEffect, useState } from "react";

export interface EtatChargement<T> {
  statut: "attente" | "chargement" | "termine" | "erreur";
  donnees: T | null;
  octetsCharges: number;
  octetsTotal: number | null;
}

/**
 * Télécharge un fichier JSON en suivant la progression (utile pour les gros GeoJSON).
 * `tailleConnue` sert de total quand le serveur n'envoie pas de Content-Length exploitable.
 */
export function useChargementJSON<T>(url: string, actif: boolean, tailleConnue: number | null): EtatChargement<T> {
  const [etat, setEtat] = useState<EtatChargement<T>>({
    statut: "attente",
    donnees: null,
    octetsCharges: 0,
    octetsTotal: tailleConnue,
  });

  useEffect(() => {
    if (!actif) return;
    const controleur = new AbortController();

    const charger = async () => {
      setEtat({ statut: "chargement", donnees: null, octetsCharges: 0, octetsTotal: tailleConnue });
      try {
        const reponse = await fetch(url, { signal: controleur.signal });
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);

        // Avec une compression gzip, Content-Length ne correspond pas aux octets décompressés lus ici.
        const longueurEntete = Number(reponse.headers.get("content-length"));
        const compresse = Boolean(reponse.headers.get("content-encoding"));
        const octetsTotal = tailleConnue ?? (!compresse && longueurEntete > 0 ? longueurEntete : null);

        if (!reponse.body) {
          const donnees = (await reponse.json()) as T;
          setEtat({ statut: "termine", donnees, octetsCharges: octetsTotal ?? 0, octetsTotal });
          return;
        }

        const lecteur = reponse.body.getReader();
        const morceaux: Uint8Array[] = [];
        let octetsCharges = 0;
        let derniereMiseAJour = 0;
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          morceaux.push(value);
          octetsCharges += value.length;
          // Une mise à jour de la progression toutes les 200 ms suffit à l'indicateur.
          const maintenant = performance.now();
          if (maintenant - derniereMiseAJour > 200) {
            derniereMiseAJour = maintenant;
            setEtat((precedent) => ({ ...precedent, octetsCharges, octetsTotal }));
          }
        }

        const tampon = new Uint8Array(octetsCharges);
        let position = 0;
        for (const morceau of morceaux) {
          tampon.set(morceau, position);
          position += morceau.length;
        }
        const donnees = JSON.parse(new TextDecoder().decode(tampon)) as T;
        setEtat({ statut: "termine", donnees, octetsCharges, octetsTotal });
      } catch (erreur) {
        if (controleur.signal.aborted) return;
        console.error("Chargement du fichier impossible :", url, erreur);
        setEtat((precedent) => ({ ...precedent, statut: "erreur", donnees: null }));
      }
    };

    charger();
    return () => controleur.abort();
  }, [url, actif, tailleConnue]);

  return etat;
}
