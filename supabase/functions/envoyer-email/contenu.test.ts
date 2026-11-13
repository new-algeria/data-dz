import { describe, expect, it } from "vitest";
import { cheminSur, construireEmail, expediteur, titreDans } from "./contenu";

const site = "https://data-dz.com";

describe("emails de notification", () => {
  it("écrit en anglais, avec le titre anglais de la donnée s'il existe", () => {
    const email = construireEmail(
      { type: "publiee", lien: "/datasets/pharmacies", donnees: { titre: { fr: "Pharmacies", en: "Pharmacies in Algeria" } } },
      site
    )!;
    expect(email.sujet).toBe("Your dataset is live: Pharmacies in Algeria");
    expect(email.html).toContain('lang="en"');
    expect(email.html).toContain("Published");
    expect(email.html).toContain('href="https://data-dz.com/datasets/pharmacies"');
    expect(email.texte).toContain("View the dataset: https://data-dz.com/datasets/pharmacies");
  });

  it("adapte statut, titre et bouton à la décision de la revue", () => {
    const revue = (decision: string, commentaire: string | null = null) =>
      construireEmail({ type: "revue", lien: "/my-submissions/1", donnees: { titre: { fr: "Écoles" }, decision, commentaire } }, site)!;
    expect(revue("acceptee").sujet).toBe("Your submission was accepted: Écoles");
    expect(revue("refusee").html).toContain("Not accepted");
    expect(revue("modifications_demandees").html).toContain("Update my submission");
    expect(revue("inconnue").sujet).toBe("New comment on your submission: Écoles");
  });

  it("met en valeur le commentaire du modérateur, échappé", () => {
    const email = construireEmail(
      { type: "revue", lien: "/my-submissions/1", donnees: { titre: { fr: "Écoles" }, decision: "refusee", commentaire: "Source <b>introuvable</b>" } },
      site
    )!;
    expect(email.html).toContain("Comment from the moderation team");
    expect(email.html).toContain("Source &lt;b&gt;introuvable&lt;/b&gt;");
    expect(email.html).not.toContain("<b>introuvable");
    expect(email.texte).toContain("Source <b>introuvable</b>");
  });

  it("n'affiche pas de commentaire hors revue, ni pour un type sans email", () => {
    const email = construireEmail({ type: "nouvelle_soumission", lien: "/moderation/submissions/1", donnees: { titre: { ar: "مدارس" }, commentaire: "x" } }, site)!;
    expect(email.sujet).toBe("New submission to review: مدارس");
    expect(email.html).not.toContain("Comment from the moderation team");
    expect(construireEmail({ type: "reponse", lien: "/", donnees: {} }, site)).toBeNull();
  });

  it("ne suit que des chemins internes et coupe les titres trop longs", () => {
    expect(cheminSur("https://evil.example")).toBe("/");
    expect(cheminSur("//evil.example")).toBe("/");
    expect(cheminSur("/datasets/x#comments")).toBe("/datasets/x#comments");
    expect(titreDans({ fr: "a".repeat(200) })).toHaveLength(120);
    expect(titreDans(null)).toBe("—");
  });

  describe("boîte à idées de New Algeria", () => {
    const statut = (nouveau: string, ancien: string, reponse: string | null = null) =>
      construireEmail(
        { type: "idee_statut", lien: "/ideas?idea=42", donnees: { titre: { fr: "Carte des pharmacies" }, statut: nouveau, ancien_statut: ancien, reponse } },
        site
      )!;

    it("prend l'en-tête, les liens et l'adresse de New Algeria", () => {
      const email = statut("retenue", "nouvelle");
      expect(email.sujet).toBe("Your idea was selected: Carte des pharmacies");
      expect(email.html).toContain("data-dz.com/newalgeria_logo.png");
      expect(email.html).toContain('href="https://www.newalgeria.org/ideas?idea=42"');
      expect(email.html).toContain("Your idea");
      expect(email.html).not.toContain("Public API");
      expect(email.texte.startsWith("New Algeria · Planned")).toBe(true);
    });

    it("annonce chaque statut, ou un simple message de l'équipe si le statut ne change pas", () => {
      expect(statut("realisee", "en_cours").sujet).toBe("Your idea is live: Carte des pharmacies");
      expect(statut("ecartee", "en_etude").html).toContain("Not for now");
      const message = statut("en_etude", "en_etude", "On en parle <vite>");
      expect(message.sujet).toBe("The team replied to your idea: Carte des pharmacies");
      expect(message.html).toContain("Message from the team");
      expect(message.html).toContain("On en parle &lt;vite&gt;");
    });

    it("cite le commentaire reçu, échappé, avec le nom de son auteur", () => {
      const email = construireEmail(
        { type: "idee_commentaire", lien: "/ideas?idea=42#comment-7", donnees: { titre: { fr: "Bus d'Alger" }, auteur: "Yacine", extrait: "Bonne idée <script>" } },
        site
      )!;
      expect(email.sujet).toBe("New comment on your idea: Bus d'Alger");
      expect(email.html).toContain("Yacine commented on your idea");
      expect(email.html).toContain("Bonne idée &lt;script&gt;");
      expect(email.html).not.toContain("<script>");
      expect(email.html).toContain('href="https://www.newalgeria.org/ideas?idea=42#comment-7"');
    });

    it("n'envoie pas d'email pour une réponse à un commentaire, et change le nom de l'expéditeur", () => {
      expect(construireEmail({ type: "idee_reponse", lien: "/ideas", donnees: {} }, site)).toBeNull();
      expect(expediteur("data-dz <notifications@data-dz.com>", true)).toBe("New Algeria <notifications@data-dz.com>");
      expect(expediteur("data-dz <notifications@data-dz.com>", false)).toBe("data-dz <notifications@data-dz.com>");
    });
  });
});
