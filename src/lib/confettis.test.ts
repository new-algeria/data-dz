import { afterEach, describe, expect, it, vi } from "vitest";
import { animationsReduites, COULEURS_CONFETTIS, feterTelechargement } from "./confettis";

const confetti = vi.fn();
vi.mock("canvas-confetti", () => ({ default: (...args: unknown[]) => confetti(...args) }));

const reglerReduction = (reduit: boolean) => {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: reduit }), setTimeout: (f: () => void) => f() });
};

describe("confettis", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    confetti.mockClear();
  });

  it("aux couleurs du drapeau", () => {
    expect(COULEURS_CONFETTIS).toEqual(expect.arrayContaining(["#006233", "#ffffff", "#d21034"]));
  });

  it("rien avec « réduire les animations »", async () => {
    reglerReduction(true);
    expect(animationsReduites()).toBe(true);
    await feterTelechargement();
    expect(confetti).not.toHaveBeenCalled();
  });

  it("trois gerbes sinon", async () => {
    reglerReduction(false);
    await feterTelechargement();
    expect(confetti).toHaveBeenCalledTimes(3);
  });
});
