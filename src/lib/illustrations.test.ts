import { describe, expect, it } from "vitest";
import { aUneImageDuPack, urlIllustration } from "./illustrations";

describe("illustrations", () => {
  it("prend l'illustration choisie, sinon l'image du pack d'après l'identifiant, sinon la carte", () => {
    expect(urlIllustration({ slug: "pharmacies", illustration_url: "https://files.data-dz.com/web-assets/datasets/x.webp" })).toBe(
      "https://files.data-dz.com/web-assets/datasets/x.webp"
    );
    expect(urlIllustration({ slug: "pharmacies" })).toMatch(/\/web-assets\/webp\/22-pharmacies\.webp$/);
    expect(urlIllustration({ slug: "pharmacies" }, "petite")).toMatch(/22-pharmacies-600\.webp$/);
    expect(urlIllustration({ slug: "inconnue" })).toMatch(/09-carte-algerie-donnees\.webp$/);
  });

  it("sait si un identifiant a sa propre image (perdue en le changeant)", () => {
    expect(aUneImageDuPack("pharmacies")).toBe(true);
    expect(aUneImageDuPack("pharmacies-de-garde-a-oran")).toBe(false);
  });
});
