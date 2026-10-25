import { useEffect, useMemo } from "react";
import { useChargementJSON } from "./use-chargement-fichier";
import { cleVisuel, ecrireVisuel, lireVisuel } from "@/lib/cacheVisuel";
import {
  choisirFichierCarte,
  choisirFichierGraphique,
  detecterVisuel,
  extraireLignes,
  visuelParDefaut,
  type DetectionVisuel,
  type Ligne,
} from "@/lib/detecterVisuel";
import type { Fichier } from "@/lib/types";

export type VueVisuel = "carte" | "graphique";

export interface EtatVisuel {
  /** « aucun » : aucun fichier exploitable, ou rien de traçable. */
  statut: "aucun" | "detection" | "pret";
  detection: DetectionVisuel | null;
  vue: VueVisuel | null;
  /** Lignes du JSON (graphique, carte des wilayas, points sans GeoJSON). null tant qu'elles ne sont pas chargées. */
  lignes: Ligne[] | null;
  erreurLignes: boolean;
  fichierCarte: Fichier | null;
  fichierJson: Fichier | null;
}

/**
 * Visuel d'une fiche : choix des fichiers, téléchargement du JSON (5 Mo maximum) et détection.
 * La détection est gardée en cache : à la visite suivante, une carte issue d'un GeoJSON s'affiche
 * sans retélécharger le JSON, qui n'est alors chargé que si l'on passe au graphique.
 */
export function useVisuel(slug: string, fichiers: Fichier[], vueDemandee: VueVisuel | null): EtatVisuel {
  const fichierCarte = useMemo(() => choisirFichierCarte(fichiers), [fichiers]);
  const fichierJson = useMemo(() => choisirFichierGraphique(fichiers), [fichiers]);
  const cle = cleVisuel(slug, [fichierCarte, fichierJson]);
  const enCache = useMemo(() => lireVisuel(cle), [cle]);

  const vueConnue = enCache ? vueDemandee ?? visuelParDefaut(enCache.detection) : null;
  const carteSansJson = enCache?.detection.carte?.genre === "points" && enCache.detection.carte.origine === "geojson";
  const besoinJson = Boolean(fichierJson) && (!enCache || vueConnue === "graphique" || (vueConnue === "carte" && !carteSansJson));

  const sources = useMemo(
    () => (fichierJson && besoinJson ? [{ url: fichierJson.url, taille: fichierJson.taille_octets }] : []),
    [fichierJson, besoinJson]
  );
  const chargement = useChargementJSON<unknown>(sources, besoinJson);

  const contenu = chargement.statut === "termine" ? chargement.donnees?.[0] ?? null : null;
  const lignes = useMemo(() => (contenu !== null ? extraireLignes(contenu) : null), [contenu]);

  const detection = useMemo<DetectionVisuel | null>(() => {
    if (!fichierCarte && !fichierJson) return { carte: null, graphique: null };
    if (enCache) return enCache.detection;
    if (chargement.statut === "termine") return detecterVisuel(fichiers, contenu);
    // JSON illisible ou injoignable : la carte d'un GeoJSON reste possible.
    if (chargement.statut === "erreur" || !fichierJson) return detecterVisuel(fichiers, null);
    return null;
  }, [fichiers, fichierCarte, fichierJson, enCache, chargement.statut, contenu]);

  useEffect(() => {
    // Une détection faite sans le contenu du JSON (erreur réseau) n'est pas mise en cache.
    if (detection && !enCache && (chargement.statut === "termine" || !fichierJson)) ecrireVisuel(cle, { detection });
  }, [detection, enCache, chargement.statut, fichierJson, cle]);

  const vueParDefaut = detection ? visuelParDefaut(detection) : null;
  const vue = detection && vueDemandee && detection[vueDemandee] ? vueDemandee : vueParDefaut;

  return {
    statut: !detection ? "detection" : vue ? "pret" : "aucun",
    detection,
    vue,
    lignes,
    erreurLignes: chargement.statut === "erreur",
    fichierCarte,
    fichierJson,
  };
}
