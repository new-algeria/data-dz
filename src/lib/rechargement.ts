import { lazy, type ComponentType } from "react";

/**
 * Après un déploiement, un onglet ouvert avant demande encore les anciens fichiers de `assets/`, qui n'existent plus
 * (Vercel renvoie alors `index.html` : « Failed to fetch dynamically imported module »). On recharge la page une fois
 * pour récupérer la nouvelle version ; si l'erreur revient juste après, on la laisse remonter (pas de boucle).
 */

const CLE_RECHARGEMENT = "data-dz:rechargement-module";
const DELAI_MIN_ENTRE_RECHARGEMENTS = 10_000;

/** Erreur d'import dynamique (fichier absent, réseau coupé, mauvais type MIME) selon Chrome, Firefox et Safari. */
export function estErreurChargementModule(erreur: unknown): boolean {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(message);
}

/** Vrai si aucun rechargement n'a eu lieu dans les dernières secondes. */
export function peutRecharger(dernier: number | null, maintenant: number): boolean {
  return dernier === null || Number.isNaN(dernier) || maintenant - dernier > DELAI_MIN_ENTRE_RECHARGEMENTS;
}

/** Recharge la page si c'est permis ; renvoie `false` si un rechargement vient déjà d'avoir lieu. */
export function rechargerApresDeploiement(): boolean {
  const maintenant = Date.now();
  let dernier: number | null = null;
  try {
    const valeur = sessionStorage.getItem(CLE_RECHARGEMENT);
    dernier = valeur === null ? null : Number(valeur);
    if (!peutRecharger(dernier, maintenant)) return false;
    sessionStorage.setItem(CLE_RECHARGEMENT, String(maintenant));
  } catch {
    // Stockage indisponible (navigation privée stricte) : sans garde-fou, on ne recharge pas.
    return false;
  }
  window.location.reload();
  return true;
}

/** `React.lazy` qui recharge la page une fois quand le fichier de la page n'existe plus (nouveau déploiement). */
export function lazyAvecRechargement<T extends ComponentType<never>>(importer: () => Promise<{ default: T }>) {
  return lazy(() =>
    importer().catch((erreur: unknown) => {
      // La page se recharge : on attend sans rien afficher d'autre que le chargement.
      if (estErreurChargementModule(erreur) && rechargerApresDeploiement()) return new Promise<never>(() => {});
      throw erreur;
    })
  );
}
