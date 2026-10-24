// Fonction Edge « envoyer-email » : envoie par email une notification créée par la base.
// Appelée uniquement par le trigger envoyer_email_notification (migration 20261024000008), avec un secret partagé.
//
// Secrets (supabase secrets set …, jamais dans ce dépôt) :
//   EMAILS_SECRET     même valeur que le secret « emails_secret » du Vault
//   RESEND_API_KEY    clé de l'API Resend (https://resend.com, offre gratuite)
//   EMAIL_EXPEDITEUR  ex. « data-dz <notifications@data-dz.com> » (domaine vérifié chez Resend)
//   URL_SITE          ex. « https://data-dz.com »
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.
//
// Déploiement : supabase functions deploy envoyer-email --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";
import { construireEmail, type NotificationEmail } from "./contenu.ts";

const env = (nom: string) => Deno.env.get(nom) ?? "";

/** Comparaison en temps constant du secret partagé. */
function memeSecret(recu: string, attendu: string): boolean {
  if (!attendu || recu.length !== attendu.length) return false;
  let difference = 0;
  for (let i = 0; i < recu.length; i++) difference |= recu.charCodeAt(i) ^ attendu.charCodeAt(i);
  return difference === 0;
}

const reponse = (statut: number, corps: Record<string, unknown>) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });

Deno.serve(async (requete) => {
  if (requete.method !== "POST") return reponse(405, { erreur: "méthode non autorisée" });
  if (!memeSecret(requete.headers.get("x-emails-secret") ?? "", env("EMAILS_SECRET"))) {
    return reponse(401, { erreur: "non autorisé" });
  }

  let notificationId: unknown;
  try {
    ({ notification_id: notificationId } = await requete.json());
  } catch {
    return reponse(400, { erreur: "corps invalide" });
  }
  if (typeof notificationId !== "string") return reponse(400, { erreur: "notification_id manquant" });

  // La notification est relue en base : la fonction n'envoie jamais un contenu venu de la requête.
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { data: notification, error } = await admin
    .from("notifications")
    .select("utilisateur_id, type, donnees, lien")
    .eq("id", notificationId)
    .maybeSingle();
  if (error) return reponse(500, { erreur: error.message });
  if (!notification) return reponse(404, { erreur: "notification introuvable" });

  const email = construireEmail(notification as NotificationEmail, env("URL_SITE") || "https://data-dz.com");
  if (!email) return reponse(200, { envoye: false, raison: "type sans email" });

  const { data: compte, error: erreurCompte } = await admin.auth.admin.getUserById(notification.utilisateur_id);
  if (erreurCompte) return reponse(500, { erreur: erreurCompte.message });
  const destinataire = compte.user?.email;
  if (!destinataire || !compte.user?.email_confirmed_at) return reponse(200, { envoye: false, raison: "email absent ou non confirmé" });

  const envoi = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("EMAIL_EXPEDITEUR") || "data-dz <onboarding@resend.dev>",
      to: [destinataire],
      subject: email.sujet,
      html: email.html,
      text: email.texte,
    }),
  });
  if (!envoi.ok) return reponse(502, { erreur: `Resend ${envoi.status} : ${await envoi.text()}` });
  return reponse(200, { envoye: true });
});
