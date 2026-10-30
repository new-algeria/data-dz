import { describe, expect, it } from "vitest";
import { cheminSur, construireEmail, titreDans } from "./contenu";

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
});
