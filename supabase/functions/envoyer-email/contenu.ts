// Contenu des emails (en anglais), sans dépendance : testable hors de Deno (contenu.test.ts, avec Vitest).
// HTML pensé pour les clients mail : mise en page en tableaux, styles en ligne, couleurs de repli sans dégradé.

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

type Ton = "vert" | "ambre" | "rouge" | "bleu" | "violet";

interface Message {
  sujet: string;
  /** Pastille de statut au-dessus du titre. */
  statut: string;
  ton: Ton;
  titre: string;
  phrase: string;
  bouton: string;
}

/** Logo servi par le site (public/), en adresse absolue : les clients mail ne suivent pas les chemins relatifs. */
const LOGO = "https://www.data-dz.com/data_dz_logo_icon.png";

const TONS: Record<Ton, { fond: string; texte: string }> = {
  vert: { fond: "#d1fae5", texte: "#065f46" },
  ambre: { fond: "#fef3c7", texte: "#92400e" },
  rouge: { fond: "#fee2e2", texte: "#991b1b" },
  bleu: { fond: "#dbeafe", texte: "#1e40af" },
  violet: { fond: "#ede9fe", texte: "#5b21b6" },
};

const echapper = (texte: string) =>
  texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Titre sur une ligne (il finit dans l'objet de l'email), 120 caractères maximum : anglais, sinon français, sinon arabe. */
export const titreDans = (titre: TexteMultilingue) =>
  (titre?.en || titre?.fr || titre?.ar)?.replace(/\s+/g, " ").trim().slice(0, 120) || "—";

/** N'accepte qu'un chemin interne du site (comme lienInterne() côté navigateur). */
export const cheminSur = (lien: string | null) =>
  lien && lien.startsWith("/") && !lien.startsWith("//") && !lien.includes("\\") ? lien : "/";

function message(n: NotificationEmail, titre: string): Message | null {
  switch (n.type) {
    case "nouvelle_soumission":
      return {
        sujet: `New submission to review: ${titre}`,
        statut: "To review",
        ton: "ambre",
        titre: "A new dataset needs your review",
        phrase: "Someone just proposed a new dataset on data-dz. It is waiting for a moderator.",
        bouton: "Review the submission",
      };
    case "revue": {
      const revues: Record<string, Omit<Message, "bouton">> = {
        acceptee: {
          sujet: `Your submission was accepted: ${titre}`,
          statut: "Accepted",
          ton: "vert",
          titre: "Good news, your submission was accepted!",
          phrase: "The moderation team accepted your submission. It will be published in the data-dz catalogue very soon.",
        },
        refusee: {
          sujet: `Your submission was not accepted: ${titre}`,
          statut: "Not accepted",
          ton: "rouge",
          titre: "Your submission was not accepted",
          phrase: "The moderation team reviewed your submission and decided not to publish it. Thank you for taking the time to contribute.",
        },
        modifications_demandees: {
          sujet: `Changes requested on your submission: ${titre}`,
          statut: "Changes requested",
          ton: "ambre",
          titre: "A few changes are needed",
          phrase: "The moderation team asks for some changes on your submission. Update it, then send it back for review.",
        },
        modification: {
          sujet: `Your submission was updated: ${titre}`,
          statut: "Updated",
          ton: "violet",
          titre: "Your submission was updated",
          phrase: "The moderation team completed or corrected your submission to get it ready for the catalogue.",
        },
        commentaire: {
          sujet: `New comment on your submission: ${titre}`,
          statut: "New comment",
          ton: "bleu",
          titre: "New comment on your submission",
          phrase: "The moderation team left a comment on your submission.",
        },
      };
      const revue = revues[n.donnees.decision ?? ""] ?? revues.commentaire;
      return { ...revue, bouton: n.donnees.decision === "modifications_demandees" ? "Update my submission" : "View my submission" };
    }
    case "publiee":
      return {
        sujet: `Your dataset is live: ${titre}`,
        statut: "Published",
        ton: "vert",
        titre: "Your dataset is live!",
        phrase: "Thank you! Your submission is now published on data-dz, free for everyone to explore, map and download.",
        bouton: "View the dataset",
      };
    default:
      return null;
  }
}

/** Construit l'email d'une notification, ou null si ce type n'est pas envoyé par email. */
export function construireEmail(n: NotificationEmail, urlSite: string): Email | null {
  const titre = titreDans(n.donnees.titre);
  const m = message(n, titre);
  if (!m) return null;

  const racine = urlSite.replace(/\/+$/, "");
  const url = racine + cheminSur(n.lien);
  const commentaire = n.type === "revue" ? n.donnees.commentaire?.trim() || null : null;
  const ton = TONS[m.ton];
  const u = echapper(url);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${echapper(m.sujet)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${echapper(`${m.titre} · ${titre}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <tr><td bgcolor="#064e3b" style="background:#064e3b;background-image:linear-gradient(135deg,#03140d 0%,#064e3b 60%,#0a5c3d 100%);padding:28px 32px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle"><img src="${LOGO}" width="40" height="40" alt="" style="display:block;border:0"></td>
        <td style="vertical-align:middle;padding-left:12px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">data-<span style="color:#34d399">dz</span></td>
      </tr></table>
      <p style="margin:14px 0 0;font-size:13px;color:#a7f3d0">Open data on Algeria</p>
    </td></tr>
    <tr><td style="padding:0;font-size:0;line-height:0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="50%" height="4" bgcolor="#006233" style="background:#006233"></td>
        <td width="25%" height="4" bgcolor="#e2e8f0" style="background:#e2e8f0"></td>
        <td width="25%" height="4" bgcolor="#d21034" style="background:#d21034"></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:36px 32px 8px">
      <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${ton.fond};color:${ton.texte};font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase">${echapper(m.statut)}</span>
      <h1 style="margin:16px 0 12px;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a">${echapper(m.titre)}</h1>
      <p style="margin:0;font-size:16px;line-height:1.6;color:#334155">${echapper(m.phrase)}</p>
    </td></tr>
    <tr><td style="padding:24px 32px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
        <tr><td style="padding:16px 20px">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#64748b">Dataset</p>
          <p dir="auto" style="margin:0;font-size:17px;font-weight:700;line-height:1.4;color:#0f172a">${echapper(titre)}</p>
        </td></tr>
      </table>
    </td></tr>${
      commentaire
        ? `
    <tr><td style="padding:16px 32px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid #10b981;background:#ecfdf5;border-radius:0 12px 12px 0">
        <tr><td style="padding:14px 18px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#047857">Comment from the moderation team</p>
          <p dir="auto" style="margin:0;font-size:15px;line-height:1.6;color:#1e293b;white-space:pre-line">${echapper(commentaire)}</p>
        </td></tr>
      </table>
    </td></tr>`
        : ""
    }
    <tr><td style="padding:28px 32px 8px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#047857" style="border-radius:10px;background:#047857">
          <a href="${u}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${echapper(m.bouton)} &rarr;</a>
        </td>
      </tr></table>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#94a3b8">Button not working? Copy this link into your browser:<br><a href="${u}" style="color:#047857;word-break:break-all">${u}</a></p>
    </td></tr>
    <tr><td style="padding:28px 32px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0">
        <tr><td style="padding-top:20px;font-size:12px;line-height:1.6;color:#64748b">
          You are receiving this email because you have an account on data-dz.<br>
          <a href="${echapper(racine)}" style="color:#047857;text-decoration:none;font-weight:600">data-dz.com</a>
          &nbsp;·&nbsp; <a href="${echapper(`${racine}/api`)}" style="color:#047857;text-decoration:none">Public API</a>
          &nbsp;·&nbsp; An open source project by <a href="https://newalgeria.org" style="color:#047857;text-decoration:none">New Algeria</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const texte = [
    `data-dz · ${m.statut}`,
    "",
    m.titre,
    "",
    m.phrase,
    "",
    `Dataset: ${titre}`,
    ...(commentaire ? ["", "Comment from the moderation team:", commentaire] : []),
    "",
    `${m.bouton}: ${url}`,
    "",
    "—",
    "You are receiving this email because you have an account on data-dz.",
    racine,
  ].join("\n");

  return { sujet: m.sujet, html, texte };
}
