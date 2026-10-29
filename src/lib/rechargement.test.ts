import { describe, expect, it } from "vitest";
import { estErreurChargementModule, peutRecharger } from "./rechargement";

describe("rechargement après un déploiement", () => {
  it("reconnaît les erreurs d'import dynamique des navigateurs", () => {
    expect(estErreurChargementModule(new TypeError("Failed to fetch dynamically imported module: https://www.data-dz.com/assets/RevueProposition-KDYLIf_M.js"))).toBe(true);
    expect(estErreurChargementModule(new TypeError("Importing a module script failed."))).toBe(true);
    expect(estErreurChargementModule(new Error("error loading dynamically imported module"))).toBe(true);
    expect(estErreurChargementModule(new Error("Unable to preload CSS for /assets/index-abc.css"))).toBe(true);
  });

  it("ignore les autres erreurs", () => {
    expect(estErreurChargementModule(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(estErreurChargementModule(null)).toBe(false);
  });

  it("ne recharge pas deux fois de suite (pas de boucle)", () => {
    expect(peutRecharger(null, 1_000_000)).toBe(true);
    expect(peutRecharger(Number.NaN, 1_000_000)).toBe(true);
    expect(peutRecharger(995_000, 1_000_000)).toBe(false);
    expect(peutRecharger(980_000, 1_000_000)).toBe(true);
  });
});
