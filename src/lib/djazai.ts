import { appelerApi, ErreurApi } from "@/lib/api";

export type RoleMessageDjazAI = "user" | "assistant";

export interface MessageDjazAI {
  role: RoleMessageDjazAI;
  content: string;
}

export interface SourceDjazAI {
  id: string;
  titre: string;
  url: string;
  image_url?: string | null;
  formats?: string[];
  source_nom: string | null;
  source_url: string | null;
  mis_a_jour_le: string | null;
  version: string | null;
  licence_code: string | null;
  licence_url: string | null;
}

export interface QuotaDjazAI {
  is_admin: boolean;
  daily_limit: number | null;
  remaining: number | null;
  resets_at: string | null;
}

export interface ReponseDjazAI {
  answer_markdown: string;
  sources: SourceDjazAI[];
  quota: QuotaDjazAI;
}

export async function chargerQuotaDjazAI(): Promise<QuotaDjazAI> {
  return appelerApi<QuotaDjazAI>("/v1/assistant/quota", { authentifie: true });
}

export async function interrogerDjazAI(
  question: string,
  history: MessageDjazAI[],
  datasetSlugs: string[]
): Promise<ReponseDjazAI> {
  return appelerApi<ReponseDjazAI>("/v1/assistant/query", {
    method: "POST",
    authentifie: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      history: history.slice(-8),
      dataset_slugs: [...new Set(datasetSlugs)].slice(-4),
    }),
  });
}

/** Clé i18n du message à afficher pour une erreur de DjazAI (même texte dans la bulle et sur la page). */
export function cleErreurDjazAI(erreur: unknown): string {
  if (erreur instanceof ErreurApi) {
    if (erreur.code === "assistant_unconfigured") return "ia.erreurConfiguration";
    if (erreur.code === "assistant_daily_limit") return "ia.quotaAtteint";
    if (erreur.code === "assistant_quota_unavailable") return "ia.quotaIndisponible";
    if (erreur.code === "authentication_required") return "ia.sessionExpiree";
    if (erreur.code === "assistant_capacity" || erreur.code === "rate_limited" || erreur.statut === 429 || erreur.statut === 503) {
      return "ia.erreurLimite";
    }
  }
  return "ia.erreurGenerique";
}

/** Quota après un refus « limite atteinte » de l'API (elle renvoie `remaining` et `resets_at` dans `details`). */
export function quotaApresLimite(courant: QuotaDjazAI | null, erreur: ErreurApi): QuotaDjazAI {
  const details = erreur.details as { remaining?: number; resets_at?: string } | undefined;
  return courant
    ? { ...courant, remaining: details?.remaining ?? 0, resets_at: details?.resets_at ?? courant.resets_at }
    : { is_admin: false, daily_limit: 5, remaining: 0, resets_at: details?.resets_at ?? null };
}

/** Il reste au moins une question aujourd'hui (toujours vrai pour un admin). */
export const peutPoser = (quota: QuotaDjazAI | null) => Boolean(quota && (quota.is_admin || (quota.remaining ?? 0) > 0));
