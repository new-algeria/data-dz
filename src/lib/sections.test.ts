import { describe, expect, it } from "vitest";
import { SECTION_DEFAUT, sectionDeChemin } from "./sections";

describe("sections colorées", () => {
  it("reconnaît la page et ses sous-pages", () => {
    expect(sectionDeChemin("/api").cle).toBe("api");
    expect(sectionDeChemin("/api/").cle).toBe("api");
    expect(sectionDeChemin("/api/exemples").cle).toBe("api");
    expect(sectionDeChemin("/djazai").cle).toBe("djazai");
    expect(sectionDeChemin("/DjazAI/conversation").cle).toBe("djazai");
  });

  it("garde le vert partout ailleurs", () => {
    for (const chemin of ["/", "", "/apis", "/datasets/api", "/djazai-test", "/themes"]) {
      expect(sectionDeChemin(chemin)).toBe(SECTION_DEFAUT);
    }
  });

  it("donne à chaque section ses favicons", () => {
    expect(sectionDeChemin("/api").favicons.png32).toBe("/favicons/favicon-api-32x32.png");
    expect(sectionDeChemin("/djazai").favicons.ico).toBe("/favicons/favicon-djazai.ico");
    expect(SECTION_DEFAUT.favicons.ico).toBe("/favicon.ico");
  });
});
