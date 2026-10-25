import { useEffect, useState } from "react";

export interface EtatChargement<T> {
  statut: "attente" | "chargement" | "termine" | "erreur";
  /** Une entrée par URL demandée, dans le même ordre. */
  donnees: T[] | null;
  octetsCharges: number;
  octetsTotal: number | null;
}

export interface SourceJSON {
  url: string;
  /** Taille connue (base de données), qui sert de total quand le serveur n'envoie pas de Content-Length exploitable. */
  taille: number | null;
}

// Fichiers déjà téléchargés pendant la visite : passer d'un fichier à l'autre sur la carte ne les recharge pas.
const cache = new Map<string, unknown>();

async function chargerUn(source: SourceJSON, signal: AbortSignal, progression: (octets: number, total: number | null) => void) {
  if (cache.has(source.url)) {
    progression(source.taille ?? 0, source.taille);
    return cache.get(source.url);
  }
  const reponse = await fetch(source.url, { signal });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);

  // Avec une compression gzip, Content-Length ne correspond pas aux octets décompressés lus ici.
  const longueurEntete = Number(reponse.headers.get("content-length"));
  const compresse = Boolean(reponse.headers.get("content-encoding"));
  const total = source.taille ?? (!compresse && longueurEntete > 0 ? longueurEntete : null);

  let donnees: unknown;
  if (!reponse.body) {
    donnees = await reponse.json();
    progression(total ?? 0, total);
  } else {
    const lecteur = reponse.body.getReader();
    const morceaux: Uint8Array[] = [];
    let octets = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      morceaux.push(value);
      octets += value.length;
      progression(octets, total);
    }
    const tampon = new Uint8Array(octets);
    let position = 0;
    for (const morceau of morceaux) {
      tampon.set(morceau, position);
      position += morceau.length;
    }
    donnees = JSON.parse(new TextDecoder().decode(tampon));
  }
  cache.set(source.url, donnees);
  return donnees;
}

/** Télécharge un fichier JSON (sans suivi de progression), en profitant du cache de la visite. */
export function chargerJSON(source: SourceJSON, signal?: AbortSignal): Promise<unknown> {
  return chargerUn(source, signal ?? new AbortController().signal, () => {});
}

/** Télécharge un ou plusieurs fichiers JSON en parallèle, avec une progression globale (utile pour les gros GeoJSON). */
export function useChargementJSON<T>(sources: SourceJSON[], actif: boolean): EtatChargement<T> {
  const cle = sources.map((source) => source.url).join("|");
  const [etat, setEtat] = useState<EtatChargement<T>>({ statut: "attente", donnees: null, octetsCharges: 0, octetsTotal: null });

  useEffect(() => {
    if (!actif || sources.length === 0) return;
    const controleur = new AbortController();
    const charges = sources.map(() => 0);
    const totaux: (number | null)[] = sources.map((source) => source.taille);
    let derniereMiseAJour = 0;

    const publier = (force = false) => {
      // Une mise à jour de la progression toutes les 200 ms suffit à l'indicateur.
      const maintenant = performance.now();
      if (!force && maintenant - derniereMiseAJour < 200) return;
      derniereMiseAJour = maintenant;
      const total = totaux.every((valeur) => valeur !== null) ? totaux.reduce<number>((somme, valeur) => somme + (valeur ?? 0), 0) : null;
      setEtat((precedent) => ({ ...precedent, octetsCharges: charges.reduce((a, b) => a + b, 0), octetsTotal: total }));
    };

    const toutCharger = async () => {
      setEtat({ statut: "chargement", donnees: null, octetsCharges: 0, octetsTotal: null });
      try {
        const donnees = await Promise.all(
          sources.map((source, indice) =>
            chargerUn(source, controleur.signal, (octets, total) => {
              charges[indice] = octets;
              totaux[indice] = total;
              publier();
            })
          )
        );
        publier(true);
        setEtat((precedent) => ({ ...precedent, statut: "termine", donnees: donnees as T[] }));
      } catch (erreur) {
        if (controleur.signal.aborted) return;
        console.error("Chargement impossible :", cle, erreur);
        setEtat((precedent) => ({ ...precedent, statut: "erreur", donnees: null }));
      }
    };

    toutCharger();
    return () => controleur.abort();
    // `cle` résume la liste des sources : un nouveau tableau avec les mêmes URL ne relance rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, actif]);

  return etat;
}
