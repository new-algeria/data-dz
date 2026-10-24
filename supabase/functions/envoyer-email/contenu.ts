// Contenu des emails (français puis arabe), sans dépendance : testable hors de Deno.

export type TexteMultilingue = { fr?: string; en?: string; ar?: string } | null | undefined;

export interface NotificationEmail {
  type: string;
  lien: string | null;
  donnees: {
    titre?: TexteMultilingue;
    decision?: string;
    commentaire?: string | null;
  };
}

export interface Email {
  sujet: string;
  html: string;
  texte: string;
}

interface Message {
  sujet: string;
  phrase: string;
  bouton: string;
}

const echapper = (texte: string) =>
  texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Titre sur une ligne (il finit dans l'objet de l'email), 120 caractères maximum. */
const titreDans = (titre: TexteMultilingue, langue: "fr" | "ar") =>
  (langue === "ar" ? titre?.ar || titre?.fr || titre?.en : titre?.fr || titre?.en || titre?.ar)?.replace(/\s+/g, " ").trim().slice(0, 120) || "—";

/** N'accepte qu'un chemin interne du site (comme lienInterne() côté navigateur). */
export const cheminSur = (lien: string | null) =>
  lien && lien.startsWith("/") && !lien.startsWith("//") && !lien.includes("\\") ? lien : "/";

function messages(n: NotificationEmail, titreFr: string, titreAr: string): { fr: Message; ar: Message } | null {
  switch (n.type) {
    case "nouvelle_soumission":
      return {
        fr: { sujet: `Nouvelle proposition à relire : ${titreFr}`, phrase: `Une nouvelle donnée a été proposée sur data-dz : « ${titreFr} ». Elle attend une revue.`, bouton: "Relire la proposition" },
        ar: { sujet: "", phrase: `تم اقتراح بيانات جديدة على data-dz: «${titreAr}». إنها في انتظار المراجعة.`, bouton: "مراجعة الاقتراح" },
      };
    case "revue": {
      const textes: Record<string, { fr: [string, string]; ar: string }> = {
        acceptee: {
          fr: ["Votre proposition a été acceptée", `Bonne nouvelle : votre proposition « ${titreFr} » a été acceptée. Elle sera bientôt mise en ligne.`],
          ar: `خبر سار: تم قبول اقتراحك «${titreAr}». سيتم نشره قريبًا.`,
        },
        refusee: {
          fr: ["Votre proposition n'a pas été retenue", `Votre proposition « ${titreFr} » n'a pas été retenue par l'équipe de modération.`],
          ar: `لم يتم قبول اقتراحك «${titreAr}» من طرف فريق الإشراف.`,
        },
        modifications_demandees: {
          fr: ["Des modifications sont demandées", `L'équipe de modération demande des modifications sur votre proposition « ${titreFr} ». Corrigez-la puis renvoyez-la.`],
          ar: `يطلب فريق الإشراف تعديلات على اقتراحك «${titreAr}». قم بتصحيحه ثم أعد إرساله.`,
        },
        modification: {
          fr: ["Votre proposition a été complétée", `L'équipe de modération a complété ou corrigé votre proposition « ${titreFr} ».`],
          ar: `قام فريق الإشراف بإكمال أو تصحيح اقتراحك «${titreAr}».`,
        },
        commentaire: {
          fr: ["Nouveau commentaire sur votre proposition", `L'équipe de modération a commenté votre proposition « ${titreFr} ».`],
          ar: `علّق فريق الإشراف على اقتراحك «${titreAr}».`,
        },
      };
      const texte = textes[n.donnees.decision ?? ""] ?? textes.commentaire;
      return {
        fr: { sujet: `${texte.fr[0]} : ${titreFr}`, phrase: texte.fr[1], bouton: "Voir ma proposition" },
        ar: { sujet: "", phrase: texte.ar, bouton: "عرض اقتراحي" },
      };
    }
    case "publiee":
      return {
        fr: { sujet: `Votre donnée est en ligne : ${titreFr}`, phrase: `Merci ! Votre proposition « ${titreFr} » est maintenant publiée sur data-dz.`, bouton: "Voir la donnée" },
        ar: { sujet: "", phrase: `شكرًا! اقتراحك «${titreAr}» منشور الآن على data-dz.`, bouton: "عرض البيانات" },
      };
    default:
      return null;
  }
}

/** Construit l'email d'une notification, ou null si ce type n'est pas envoyé par email. */
export function construireEmail(n: NotificationEmail, urlSite: string): Email | null {
  const titreFr = titreDans(n.donnees.titre, "fr");
  const titreAr = titreDans(n.donnees.titre, "ar");
  const m = messages(n, titreFr, titreAr);
  if (!m) return null;

  const url = urlSite.replace(/\/+$/, "") + cheminSur(n.lien);
  const commentaire = n.type === "revue" ? n.donnees.commentaire?.trim() || null : null;
  const urlEchappee = echapper(url);

  const bloc = (langue: "fr" | "ar", message: Message) => `
    <div dir="${langue === "ar" ? "rtl" : "ltr"}" lang="${langue}" style="text-align:${langue === "ar" ? "right" : "left"}">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">${echapper(message.phrase)}</p>
      ${commentaire ? `<blockquote dir="auto" style="margin:0 0 16px;padding:12px 16px;background:#f3f4f6;border-radius:8px;white-space:pre-line;font-size:14px;color:#374151">${echapper(commentaire)}</blockquote>` : ""}
      <a href="${urlEchappee}" style="display:inline-block;padding:10px 18px;background:#047857;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">${echapper(message.bouton)}</a>
    </div>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
    <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#047857">data-dz</p>
    ${bloc("fr", m.fr)}
    <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb">
    ${bloc("ar", m.ar)}
    <p style="margin:28px 0 0;font-size:12px;color:#6b7280">Vous recevez cet email car vous avez un compte sur data-dz. · تتلقى هذه الرسالة لأن لديك حسابًا على data-dz.</p>
  </div>
</body></html>`;

  const texte = [m.fr.phrase, commentaire ? `\n« ${commentaire} »\n` : "", `${m.fr.bouton} : ${url}`, "", "—", "", m.ar.phrase, `${m.ar.bouton}: ${url}`].join("\n");

  return { sujet: m.fr.sujet, html, texte };
}
