import { describe, expect, it } from "vitest";
import {
  ajouterMessage,
  bornerConversations,
  cleConversations,
  ecrireQuestionEnAttente,
  enregistrerConversations,
  historiquePourApi,
  lireConversations,
  lireQuestionEnAttente,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PAR_CONVERSATION,
  slugsRecents,
  titreDepuisQuestion,
  type ConversationDjazAI,
  type MessageConversation,
  type StockageCle,
} from "./conversations-djazai";

const stockageMemoire = (): StockageCle & { donnees: Map<string, string> } => {
  const donnees = new Map<string, string>();
  return {
    donnees,
    getItem: (cle) => donnees.get(cle) ?? null,
    setItem: (cle, valeur) => { donnees.set(cle, valeur); },
    removeItem: (cle) => { donnees.delete(cle); },
  };
};

const message = (id: string, role: "user" | "assistant", contenu = id, extra: Partial<MessageConversation> = {}): MessageConversation =>
  ({ id, role, contenu, ...extra });

const conversation = (id: string, misAJourLe: string, messages = [message(`${id}-1`, "user")]): ConversationDjazAI =>
  ({ id, titre: id, creeLe: misAJourLe, misAJourLe, messages });

describe("conversations DjazAI", () => {
  it("range chaque compte sous sa propre clé", () => {
    expect(cleConversations("abc")).toBe("data-dz:djazai:conversations:v1:abc");
    expect(cleConversations(null)).toBe("data-dz:djazai:conversations:v1:visiteur");
  });

  it("tire un titre court de la première question", () => {
    expect(titreDepuisQuestion("  Combien   de pharmacies ?\n")).toBe("Combien de pharmacies ?");
    const long = titreDepuisQuestion("Quelles sont les données disponibles sur les écoles primaires et les lycées de la wilaya d'Oran ?");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("…")).toBe(true);
  });

  it("relit ce qui a été enregistré et ignore un stockage abîmé", () => {
    const stockage = stockageMemoire();
    const conversations = [conversation("a", "2026-11-10T10:00:00.000Z")];
    expect(enregistrerConversations(stockage, "u1", conversations)).toBe(true);
    expect(lireConversations(stockage, "u1")).toEqual(conversations);
    expect(lireConversations(stockage, "u2")).toEqual([]);

    stockage.setItem(cleConversations("u1"), "{pas du json");
    expect(lireConversations(stockage, "u1")).toEqual([]);
    stockage.setItem(cleConversations("u1"), JSON.stringify([{ id: 1 }, conversation("b", "2026-11-10T09:00:00.000Z")]));
    expect(lireConversations(stockage, "u1").map((c) => c.id)).toEqual(["b"]);
    expect(lireConversations(null, "u1")).toEqual([]);
  });

  it("supporte un navigateur qui refuse l'écriture", () => {
    const refuse: StockageCle = {
      getItem: () => { throw new Error("bloqué"); },
      setItem: () => { throw new Error("plein"); },
      removeItem: () => undefined,
    };
    expect(enregistrerConversations(refuse, "u1", [conversation("a", "2026-11-10T10:00:00.000Z")])).toBe(false);
    expect(lireConversations(refuse, "u1")).toEqual([]);
  });

  it("efface la clé quand il n'y a plus rien à garder", () => {
    const stockage = stockageMemoire();
    enregistrerConversations(stockage, "u1", [conversation("a", "2026-11-10T10:00:00.000Z")]);
    enregistrerConversations(stockage, "u1", []);
    expect(stockage.donnees.size).toBe(0);
  });

  it("borne le nombre de conversations et de messages", () => {
    const nombreuses = Array.from({ length: MAX_CONVERSATIONS + 5 }, (_, i) =>
      conversation(`c${i}`, new Date(Date.UTC(2026, 10, 1, i)).toISOString()));
    const bornees = bornerConversations(nombreuses);
    expect(bornees).toHaveLength(MAX_CONVERSATIONS);
    expect(bornees[0].id).toBe(`c${MAX_CONVERSATIONS + 4}`);

    let liste: ConversationDjazAI[] = [];
    for (let i = 0; i < MAX_MESSAGES_PAR_CONVERSATION + 3; i += 1) liste = ajouterMessage(liste, "x", message(`m${i}`, "user"));
    expect(liste[0].messages).toHaveLength(MAX_MESSAGES_PAR_CONVERSATION);
    expect(liste[0].messages.at(-1)?.id).toBe(`m${MAX_MESSAGES_PAR_CONVERSATION + 2}`);
  });

  it("crée la conversation au premier message et la remonte en tête", () => {
    const avant = [conversation("ancienne", "2026-11-01T00:00:00.000Z")];
    const apres = ajouterMessage(avant, "neuve", message("q", "user", "Où sont les plages ?"), new Date("2026-11-10T12:00:00Z"));
    expect(apres.map((c) => c.id)).toEqual(["neuve", "ancienne"]);
    expect(apres[0].titre).toBe("Où sont les plages ?");
    const suite = ajouterMessage(apres, "ancienne", message("r", "assistant"), new Date("2026-11-11T12:00:00Z"));
    expect(suite.map((c) => c.id)).toEqual(["ancienne", "neuve"]);
    expect(suite[0].titre).toBe("ancienne");
  });

  it("n'envoie à l'API que les vrais échanges, et les données citées récemment", () => {
    const source = (id: string) => ({ id, titre: id, url: "", source_nom: null, source_url: null, mis_a_jour_le: null, version: null, licence_code: null, licence_url: null });
    const messages = [
      message("1", "user", "q1"),
      message("2", "assistant", "r1", { sources: [source("ecoles"), source("plages")] }),
      message("3", "user", "q2"),
      message("4", "assistant", "oups", { erreur: true }),
      message("5", "assistant", "", { verrouille: true }),
      message("6", "assistant", "r2", { sources: [source("plages"), source("hopitaux")] }),
    ];
    expect(historiquePourApi(messages)).toEqual([
      { role: "user", content: "q1" },
      { role: "assistant", content: "r1" },
      { role: "user", content: "q2" },
      { role: "assistant", content: "r2" },
    ]);
    expect(slugsRecents(messages)).toEqual(["plages", "hopitaux", "ecoles"]);
  });

  it("garde la question d'un visiteur pour après la connexion", () => {
    const stockage = stockageMemoire();
    ecrireQuestionEnAttente(stockage, "  Combien d'aéroports ?  ");
    expect(lireQuestionEnAttente(stockage)).toBe("Combien d'aéroports ?");
    ecrireQuestionEnAttente(stockage, null);
    expect(lireQuestionEnAttente(stockage)).toBeNull();
  });
});
