import type { FicheApi } from "./apercu.js";

/** Adresse de l'API (même variable que le site). */
const URL_API = (process.env.VITE_URL_API ?? "https://api.data-dz.com").replace(/\/+$/, "");

/** Slug valide (évite d'appeler l'API avec n'importe quoi). */
export const slugValide = (slug: string | null): slug is string => Boolean(slug && /^[a-z0-9][a-z0-9-]{0,99}$/.test(slug));

/** Fiche publiée, ou null si elle n'existe pas ou si l'API ne répond pas (l'aperçu par défaut est alors utilisé). */
export async function chargerFiche(slug: string): Promise<FicheApi | null> {
  try {
    const reponse = await fetch(`${URL_API}/v1/datasets/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } });
    return reponse.ok ? ((await reponse.json()) as FicheApi) : null;
  } catch {
    return null;
  }
}
