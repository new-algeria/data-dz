import { supabase } from "./supabase";
import { texteTraduit } from "./traduction";
import type { TexteMultilingue } from "./types";

// Notifications (table notifications — migration 20261019000005), créées uniquement par les triggers de la base.
// Le lien est un chemin du site, déjà en anglais (migration 20261022000006).

export const TYPES_NOTIFICATION = ["nouvelle_soumission", "revue", "publiee", "reponse", "nouvelle_version"] as const;
export type TypeNotification = (typeof TYPES_NOTIFICATION)[number];

export interface Notification {
  id: string;
  type: string;
  donnees: {
    titre?: TexteMultilingue;
    decision?: string;
    commentaire?: string | null;
    version?: string | null;
    dataset_slug?: string;
    slug?: string | null;
    type?: string;
  };
  lien: string | null;
  lue: boolean;
  cree_le: string;
}

export const NB_NOTIFICATIONS_AFFICHEES = 20;

export interface BoiteNotifications {
  liste: Notification[];
  nonLues: number;
}

/** Les 20 dernières notifications et le nombre total de non lues (la RLS ne montre que les siennes). */
export async function chargerNotifications(): Promise<BoiteNotifications> {
  const [liste, compte] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, donnees, lien, lue, cree_le")
      .order("cree_le", { ascending: false })
      .limit(NB_NOTIFICATIONS_AFFICHEES),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("lue", false),
  ]);
  if (liste.error) throw liste.error;
  if (compte.error) throw compte.error;
  return { liste: (liste.data ?? []) as Notification[], nonLues: compte.count ?? 0 };
}

export async function marquerLue(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ lue: true }).eq("id", id);
  if (error) throw error;
}

export async function toutMarquerLu(): Promise<void> {
  const { error } = await supabase.from("notifications").update({ lue: true }).eq("lue", false);
  if (error) throw error;
}

/** N'ouvre que des chemins internes (« /datasets/… ») : jamais d'URL externe venue de la base. */
export const lienInterne = (lien: string | null): string | null =>
  lien && lien.startsWith("/") && !lien.startsWith("//") && !lien.includes("\\") ? lien : null;

/** Clé i18n et paramètres du texte d'une notification. */
export function texteNotification(n: Notification, langue: string): { cle: string; valeurs: Record<string, string> } {
  const titre = texteTraduit(n.donnees.titre, langue) || n.donnees.dataset_slug || n.donnees.slug || "";
  switch (n.type) {
    case "nouvelle_soumission":
      return { cle: "notifications.types.nouvelle_soumission", valeurs: { titre } };
    case "revue": {
      const decision = ["commentaire", "modifications_demandees", "acceptee", "refusee", "modification"].includes(n.donnees.decision ?? "")
        ? n.donnees.decision
        : "commentaire";
      return { cle: `notifications.types.revue.${decision}`, valeurs: { titre } };
    }
    case "publiee":
      return { cle: "notifications.types.publiee", valeurs: { titre } };
    case "reponse":
      return { cle: "notifications.types.reponse", valeurs: { titre: n.donnees.dataset_slug ?? "" } };
    case "nouvelle_version":
      return { cle: "notifications.types.nouvelle_version", valeurs: { titre, version: n.donnees.version ?? "" } };
    default:
      return { cle: "notifications.types.autre", valeurs: {} };
  }
}
