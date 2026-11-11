import type { MessageDjazAI, SourceDjazAI } from "./djazai";

/**
 * Conversations de la page DjazAI, gardées dans le navigateur (localStorage), une liste par compte
 * (`visiteur` sans connexion). Rien n'est envoyé au serveur : seul l'historique récent part avec chaque question.
 */

export interface MessageConversation {
  id: string;
  role: "user" | "assistant";
  contenu: string;
  sources?: SourceDjazAI[];
  /** Message d'erreur affiché à la place d'une réponse : jamais renvoyé à l'API. */
  erreur?: boolean;
  /** Réponse réservée aux membres (visiteur) : rien n'a été demandé à l'API. */
  verrouille?: boolean;
}

export interface ConversationDjazAI {
  id: string;
  titre: string;
  creeLe: string;
  misAJourLe: string;
  messages: MessageConversation[];
}

/** Stockage minimal (localStorage ou un double dans les tests). */
export type StockageCle = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const MAX_CONVERSATIONS = 20;
export const MAX_MESSAGES_PAR_CONVERSATION = 40;
export const LONGUEUR_MAX_TITRE = 60;
const PREFIXE = "data-dz:djazai:conversations:v1:";
/** Question posée par un visiteur, reprise dans le champ après la connexion. */
export const CLE_QUESTION_EN_ATTENTE = "data-dz:djazai:question-en-attente";

export const cleConversations = (utilisateurId: string | null | undefined) => `${PREFIXE}${utilisateurId || "visiteur"}`;

export const nouvelIdentifiant = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Titre d'une conversation : sa première question, sur une ligne, coupée proprement. */
export function titreDepuisQuestion(question: string): string {
  const ligne = question.replace(/\s+/g, " ").trim();
  if (ligne.length <= LONGUEUR_MAX_TITRE) return ligne;
  const coupe = ligne.slice(0, LONGUEUR_MAX_TITRE - 1);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${(dernierEspace > 30 ? coupe.slice(0, dernierEspace) : coupe).trimEnd()}…`;
}

const estMessage = (valeur: unknown): valeur is MessageConversation => {
  if (!valeur || typeof valeur !== "object") return false;
  const message = valeur as Partial<MessageConversation>;
  return typeof message.id === "string"
    && (message.role === "user" || message.role === "assistant")
    && typeof message.contenu === "string";
};

const estConversation = (valeur: unknown): valeur is ConversationDjazAI => {
  if (!valeur || typeof valeur !== "object") return false;
  const conversation = valeur as Partial<ConversationDjazAI>;
  return typeof conversation.id === "string"
    && typeof conversation.titre === "string"
    && typeof conversation.misAJourLe === "string"
    && Array.isArray(conversation.messages);
};

/** Les plus récentes d'abord, nombre de conversations et de messages bornés. */
export function bornerConversations(conversations: ConversationDjazAI[]): ConversationDjazAI[] {
  return [...conversations]
    .sort((a, b) => b.misAJourLe.localeCompare(a.misAJourLe))
    .slice(0, MAX_CONVERSATIONS)
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages.slice(-MAX_MESSAGES_PAR_CONVERSATION),
    }));
}

/** Lecture tolérante : stockage inaccessible, JSON abîmé ou entrées invalides donnent une liste (éventuellement vide). */
export function lireConversations(stockage: StockageCle | null, utilisateurId: string | null | undefined): ConversationDjazAI[] {
  if (!stockage) return [];
  try {
    const brut = stockage.getItem(cleConversations(utilisateurId));
    if (!brut) return [];
    const valeur: unknown = JSON.parse(brut);
    if (!Array.isArray(valeur)) return [];
    return bornerConversations(
      valeur
        .filter(estConversation)
        .map((conversation) => ({ ...conversation, messages: conversation.messages.filter(estMessage) }))
        .filter((conversation) => conversation.messages.length > 0),
    );
  } catch {
    return [];
  }
}

/** Écriture : renvoie `false` si le navigateur refuse (navigation privée, quota plein). */
export function enregistrerConversations(
  stockage: StockageCle | null,
  utilisateurId: string | null | undefined,
  conversations: ConversationDjazAI[],
): boolean {
  if (!stockage) return false;
  try {
    const aGarder = bornerConversations(conversations.filter((conversation) => conversation.messages.length > 0));
    if (aGarder.length === 0) stockage.removeItem(cleConversations(utilisateurId));
    else stockage.setItem(cleConversations(utilisateurId), JSON.stringify(aGarder));
    return true;
  } catch {
    return false;
  }
}

/** Ajoute un message à une conversation (créée si besoin) et la remonte en tête de liste. */
export function ajouterMessage(
  conversations: ConversationDjazAI[],
  conversationId: string,
  message: MessageConversation,
  maintenant: Date = new Date(),
): ConversationDjazAI[] {
  const date = maintenant.toISOString();
  const existante = conversations.find((conversation) => conversation.id === conversationId);
  const misAJour: ConversationDjazAI = existante
    ? { ...existante, misAJourLe: date, messages: [...existante.messages, message].slice(-MAX_MESSAGES_PAR_CONVERSATION) }
    : {
        id: conversationId,
        titre: titreDepuisQuestion(message.role === "user" ? message.contenu : ""),
        creeLe: date,
        misAJourLe: date,
        messages: [message],
      };
  return bornerConversations([misAJour, ...conversations.filter((conversation) => conversation.id !== conversationId)]);
}

/** Historique envoyé à l'API : les 8 derniers échanges réels (ni erreurs ni réponses verrouillées). */
export function historiquePourApi(messages: MessageConversation[]): MessageDjazAI[] {
  return messages
    .filter((message) => !message.erreur && !message.verrouille)
    .map((message) => ({ role: message.role, content: message.contenu }))
    .slice(-8);
}

/** Données citées récemment (4 au plus, les plus récentes d'abord) : elles aident l'API à suivre le fil. */
export function slugsRecents(messages: MessageConversation[]): string[] {
  return [...new Set(
    messages
      .slice()
      .reverse()
      .flatMap((message) => (message.role === "assistant" ? (message.sources ?? []).map((source) => source.id) : [])),
  )].slice(0, 4);
}

/** Accès sûr à localStorage (absent, bloqué ou interdit selon le navigateur). */
export function stockageNavigateur(): StockageCle | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function lireQuestionEnAttente(stockage: StockageCle | null): string | null {
  try {
    return stockage?.getItem(CLE_QUESTION_EN_ATTENTE)?.trim() || null;
  } catch {
    return null;
  }
}

export function ecrireQuestionEnAttente(stockage: StockageCle | null, question: string | null) {
  try {
    if (!stockage) return;
    if (question?.trim()) stockage.setItem(CLE_QUESTION_EN_ATTENTE, question.trim().slice(0, 1200));
    else stockage.removeItem(CLE_QUESTION_EN_ATTENTE);
  } catch {
    // Stockage indisponible : la question ne sera simplement pas reprise.
  }
}
