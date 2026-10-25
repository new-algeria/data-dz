// Informations de couverture fournies par la source (datasets.infos_source).

// Clés connues des métadonnées de la source, dans l'ordre d'affichage. Les autres (bbox, clés techniques) sont masquées.
export const CLES_AFFICHEES = [
  "nb_enregistrements",
  "nb_wilayas_couvertes",
  "couverture_pct",
  "taux_geocodage",
  "premiere_annee_observee",
  "derniere_annee_observee",
  "derniere_annee_projetee",
  "periode",
  "nb_series",
  "nb_indicateurs",
  "nb_pays",
  "frequence",
  "unite",
  "mis_a_jour_par_la_source",
  "paquet",
  "note_couverture",
] as const;
export const POURCENTAGES = new Set(["couverture_pct", "taux_geocodage"]);
export const ANNEES = new Set(["premiere_annee_observee", "derniere_annee_observee", "derniere_annee_projetee"]);

/** Vrai si au moins une information de couverture connue peut être affichée. */
export const aDesInfosSource = (infos: Record<string, unknown> | null) =>
  Boolean(infos) && CLES_AFFICHEES.some((cle) => infos?.[cle] !== null && infos?.[cle] !== undefined && infos?.[cle] !== "");
