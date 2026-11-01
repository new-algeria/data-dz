import { appelerApi } from "@/lib/api";

export type RoleMessageDjazAI = "user" | "assistant";

export interface MessageDjazAI {
  role: RoleMessageDjazAI;
  content: string;
}

export interface SourceDjazAI {
  id: string;
  titre: string;
  url: string;
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
