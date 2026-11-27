import { describe, expect, it } from "vitest";
import { cheminsFichiers, confirmationValide, raisonErreur, sousDossiers } from "./compte";

describe("confirmationValide", () => {
  it("pseudo exact, sans casse ni espaces autour", () => {
    expect(confirmationValide("  Yacine16 ", "yacine16")).toBe(true);
    expect(confirmationValide("yacine", "yacine16")).toBe(false);
    expect(confirmationValide("", "")).toBe(false);
  });
});

describe("raisonErreur", () => {
  it("administrateur, migration absente ou autre", () => {
    expect(raisonErreur({ code: "DZ001" })).toBe("admin");
    expect(raisonErreur({ code: "PGRST202" })).toBe("indisponible");
    expect(raisonErreur({ code: "500" })).toBe("inconnue");
  });
});

describe("dossiers de stockage", () => {
  const entrees = [
    { name: "avatar-1.png", id: "a" },
    { name: "proposition-42", id: null },
  ];
  it("sépare fichiers et sous-dossiers", () => {
    expect(cheminsFichiers("uid", entrees)).toEqual(["uid/avatar-1.png"]);
    expect(sousDossiers("uid", entrees)).toEqual(["uid/proposition-42"]);
  });
});
