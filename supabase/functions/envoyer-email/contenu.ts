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
    role?: TexteMultilingue;
    /** Boîte à idées de New Algeria (types idee_*). */
    statut?: string;
    ancien_statut?: string;
    reponse?: string | null;
    auteur?: string | null;
    extrait?: string | null;
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

/** Site d'où vient la notification : data-dz, ou New Algeria pour la boîte à idées (types idee_*). */
interface Marque {
  logo: string;
  nomHtml: string;
  nomTexte: string;
  accroche: string;
  pied: string;
  liens: (racine: string) => string;
}

const MARQUE_DATA_DZ: Marque = {
  logo: LOGO,
  nomHtml: 'data-<span style="color:#34d399">dz</span>',
  nomTexte: "data-dz",
  accroche: "Open data on Algeria",
  pied: "You are receiving this email because you have an account on data-dz.",
  liens: (racine) =>
    `<a href="${echapper(racine)}" style="color:#047857;text-decoration:none;font-weight:600">data-dz.com</a>
          &nbsp;·&nbsp; <a href="${echapper(`${racine}/api`)}" style="color:#047857;text-decoration:none">Public API</a>
          &nbsp;·&nbsp; An open source project by <a href="https://newalgeria.org" style="color:#047857;text-decoration:none">New Algeria</a>`,
};

const MARQUE_NEW_ALGERIA: Marque = {
  logo: "https://www.data-dz.com/newalgeria_logo.png",
  nomHtml: 'New <span style="color:#34d399">Algeria</span>',
  nomTexte: "New Algeria",
  accroche: "Algeria's digital future, built by and for Algerians",
  pied: "You are receiving this email because you have a New Algeria account (the same account as data-dz).",
  liens: (racine) =>
    `<a href="${echapper(racine)}" style="color:#047857;text-decoration:none;font-weight:600">newalgeria.org</a>
          &nbsp;·&nbsp; <a href="${echapper(`${racine}/ideas`)}" style="color:#047857;text-decoration:none">Idea box</a>
          &nbsp;·&nbsp; <a href="https://www.data-dz.com" style="color:#047857;text-decoration:none">data-dz</a>`,
};

export const estNotificationIdee = (type: string) => type.startsWith("idee_");

/** « data-dz <notifications@data-dz.com> » devient « New Algeria <notifications@data-dz.com> » pour la boîte à idées. */
export const expediteur = (adresse: string, idee: boolean) => {
  if (!idee) return adresse;
  const email = adresse.match(/<([^>]+)>/)?.[1] ?? adresse.trim();
  return `New Algeria <${email}>`;
};

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
    case "idee_statut": {
      const changement = n.donnees.statut !== n.donnees.ancien_statut;
      if (!changement) {
        return {
          sujet: `The team replied to your idea: ${titre}`,
          statut: "New message",
          ton: "bleu",
          titre: "The team replied to your idea",
          phrase: "The New Algeria team left a message on your idea.",
          bouton: "View my idea",
        };
      }
      const statuts: Record<string, Omit<Message, "bouton">> = {
        en_etude: {
          sujet: `Your idea is under review: ${titre}`,
          statut: "Under review",
          ton: "bleu",
          titre: "The team is looking at your idea",
          phrase: "Good news: the New Algeria team is studying your idea to see how to make it happen.",
        },
        retenue: {
          sujet: `Your idea was selected: ${titre}`,
          statut: "Planned",
          ton: "violet",
          titre: "Great news, your idea was selected!",
          phrase: "The New Algeria team decided to build your idea. Thank you for helping Algeria move forward!",
        },
        en_cours: {
          sujet: `Your idea is being built: ${titre}`,
          statut: "In progress",
          ton: "ambre",
          titre: "Your idea is being built",
          phrase: "Work has started on your idea. We will let you know as soon as it is live.",
        },
        realisee: {
          sujet: `Your idea is live: ${titre}`,
          statut: "Done",
          ton: "vert",
          titre: "Your idea is live!",
          phrase: "It happened: your idea is now a reality. Thank you for proposing it to the community!",
        },
        ecartee: {
          sujet: `Update on your idea: ${titre}`,
          statut: "Not for now",
          ton: "rouge",
          titre: "Your idea was not selected for now",
          phrase: "The team reviewed your idea and is not able to take it on for now. Thank you for sharing it: keep the ideas coming!",
        },
        nouvelle: {
          sujet: `Update on your idea: ${titre}`,
          statut: "New",
          ton: "bleu",
          titre: "Your idea was updated",
          phrase: "The New Algeria team updated the status of your idea.",
        },
      };
      return { ...(statuts[n.donnees.statut ?? ""] ?? statuts.nouvelle), bouton: "View my idea" };
    }
    case "idee_commentaire": {
      const auteur = n.donnees.auteur?.trim() || "Someone";
      return {
        sujet: `New comment on your idea: ${titre}`,
        statut: "New comment",
        ton: "bleu",
        titre: "New comment on your idea",
        phrase: `${auteur} commented on your idea in the New Algeria idea box.`,
        bouton: "Read and reply",
      };
    }
    case "role_attribue": {
      const role = n.donnees.role?.en || n.donnees.role?.fr || "data-dz member";
      return {
        sujet: "A special role was assigned to your data-dz account",
        statut: "Role assigned",
        ton: "violet",
        titre: "Your role has been updated",
        phrase: `A special role has been assigned to your account: ${role}.`,
        bouton: "View my profile",
      };
    }
    default:
      return null;
  }
}

/** Construit l'email d'une notification, ou null si ce type n'est pas envoyé par email. */
export function construireEmail(n: NotificationEmail, urlSite: string, urlNewAlgeria = "https://www.newalgeria.org"): Email | null {
  const titre = n.type === "role_attribue"
    ? n.donnees.role?.en || n.donnees.role?.fr || n.donnees.role?.ar || "—"
    : titreDans(n.donnees.titre);
  const m = message(n, titre);
  if (!m) return null;

  const idee = estNotificationIdee(n.type);
  const marque = idee ? MARQUE_NEW_ALGERIA : MARQUE_DATA_DZ;
  const racine = (idee ? urlNewAlgeria : urlSite).replace(/\/+$/, "");
  const url = racine + cheminSur(n.lien);
  // Encadré sous la carte : commentaire de la modération, message de l'équipe ou extrait du commentaire.
  const citation =
    n.type === "revue" && n.donnees.commentaire?.trim()
      ? { libelle: "Comment from the moderation team", texte: n.donnees.commentaire.trim() }
      : n.type === "idee_statut" && n.donnees.reponse?.trim()
        ? { libelle: "Message from the team", texte: n.donnees.reponse.trim() }
        : n.type === "idee_commentaire" && n.donnees.extrait?.trim()
          ? { libelle: `${n.donnees.auteur?.trim() || "Comment"} wrote`, texte: n.donnees.extrait.trim() }
          : null;
  const contexteLibelle = n.type === "role_attribue" ? "Account role" : idee ? "Your idea" : "Dataset";
  const contexteValeur = n.type === "role_attribue"
    ? n.donnees.role?.en || n.donnees.role?.fr || "data-dz member"
    : titre;
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
        <td style="vertical-align:middle"><img src="${marque.logo}" width="40" height="40" alt="" style="display:block;border:0"></td>
        <td style="vertical-align:middle;padding-left:12px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${marque.nomHtml}</td>
      </tr></table>
      <p style="margin:14px 0 0;font-size:13px;color:#a7f3d0">${echapper(marque.accroche)}</p>
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
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#64748b">${echapper(contexteLibelle)}</p>
          <p dir="auto" style="margin:0;font-size:17px;font-weight:700;line-height:1.4;color:#0f172a">${echapper(contexteValeur)}</p>
        </td></tr>
      </table>
    </td></tr>${
      citation
        ? `
    <tr><td style="padding:16px 32px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid #10b981;background:#ecfdf5;border-radius:0 12px 12px 0">
        <tr><td style="padding:14px 18px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#047857">${echapper(citation.libelle)}</p>
          <p dir="auto" style="margin:0;font-size:15px;line-height:1.6;color:#1e293b;white-space:pre-line">${echapper(citation.texte)}</p>
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
          ${echapper(marque.pied)}<br>
          ${marque.liens(racine)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const texte = [
    `${marque.nomTexte} · ${m.statut}`,
    "",
    m.titre,
    "",
    m.phrase,
    "",
    `${contexteLibelle}: ${contexteValeur}`,
    ...(citation ? ["", `${citation.libelle}:`, citation.texte] : []),
    "",
    `${m.bouton}: ${url}`,
    "",
    "—",
    marque.pied,
    racine,
  ].join("\n");

  return { sujet: m.sujet, html, texte };
}
