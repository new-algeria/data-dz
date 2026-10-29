import { supabase } from "./supabase";

/** Racine de l'API publique (api.data-dz.com). Tout le catalogue et tous les fichiers passent par elle. */
export const URL_API = (import.meta.env.VITE_URL_API ?? "https://api.data-dz.com").replace(/\/+$/, "");

/** Erreur renvoyée par l'API (corps RFC 9457 : `code`, `title`, `status`). */
export class ErreurApi extends Error {
  constructor(
    readonly statut: number,
    readonly code: string,
    message: string,
    /** Précisions de l'API (ex. `{ slug }` pour une source qui existe déjà). */
    readonly details?: unknown
  ) {
    super(message);
  }
}

interface OptionsAppel extends RequestInit {
  /** Joint la session Supabase (routes /v1/admin). */
  authentifie?: boolean;
}

export async function appelerApi<T>(chemin: string, { authentifie, headers, ...init }: OptionsAppel = {}): Promise<T> {
  const entetes = new Headers(headers);
  entetes.set("Accept", "application/json");
  if (authentifie) {
    const { data } = await supabase.auth.getSession();
    if (data.session) entetes.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  const reponse = await fetch(`${URL_API}${chemin}`, { ...init, headers: entetes });
  if (reponse.status === 204) return undefined as T;
  const corps = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, corps?.code ?? "http_error", corps?.title ?? `HTTP ${reponse.status}`, corps?.details);
  }
  return corps as T;
}

/** URL d'une donnée dans l'API (affichée et copiée depuis la fiche). */
export const urlApiDonnee = (slug: string) => `${URL_API}/v1/datasets/${slug}`;

/** Lien de téléchargement stable (l'API redirige vers un lien signé qui expire). */
export function urlTelechargement(slug: string, nom: string, format: string, inline = false): string {
  const params = new URLSearchParams({ format, file: nom });
  if (inline) params.set("inline", "1");
  return `${urlApiDonnee(slug)}/download?${params}`;
}
