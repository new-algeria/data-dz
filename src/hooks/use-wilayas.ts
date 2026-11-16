import { useQuery } from "@tanstack/react-query";
import { urlTelechargement } from "@/lib/api";
import { chargerChiffresWilayas } from "@/lib/wilayas";

/**
 * Clé du cache des chiffres par wilaya. Surtout pas `["wilayas"]` : cette clé porte déjà la liste des noms
 * (`chargerWilayas()`, accueil, propositions, cartes des fiches), et partager la clé mélangerait les deux formats.
 */
export const CLE_CHIFFRES_WILAYAS = ["chiffres-wilayas"] as const;

/** Chiffres de toutes les données par wilaya (une requête pour toutes les pages « Ma wilaya »). */
export const useChiffresWilayas = () =>
  useQuery({ queryKey: CLE_CHIFFRES_WILAYAS, queryFn: chargerChiffresWilayas, staleTime: 30 * 60 * 1000, retry: 2 });

export interface ContourWilaya {
  type: "Feature";
  properties: { code?: string | number } & Record<string, unknown>;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

/** Contours des 69 wilayas (GeoAlgeria, ODbL), lus une fois par visite. */
export const useContoursWilayas = () =>
  useQuery({
    queryKey: ["contours-wilayas"],
    queryFn: async () => {
      const reponse = await fetch(urlTelechargement("divisions-administratives", "wilaya-boundaries", "geojson", true));
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      return ((await reponse.json()) as { features: ContourWilaya[] }).features;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

