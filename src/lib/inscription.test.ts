import { describe, expect, it } from "vitest";
import { doitSignalerInscription } from "./inscription";

const maintenant = Date.parse("2026-11-12T12:00:00Z");
const ilYa = (ms: number) => new Date(maintenant - ms).toISOString();

describe("doitSignalerInscription", () => {
  it("signale un compte qui vient d'être créé", () => {
    expect(doitSignalerInscription({ created_at: ilYa(60_000), app_metadata: {} }, maintenant)).toBe(true);
  });

  it("ne signale pas un compte déjà signalé", () => {
    expect(doitSignalerInscription({ created_at: ilYa(60_000), app_metadata: { inscription_signalee: true } }, maintenant)).toBe(false);
  });

  it("ignore les comptes de plus de 7 jours", () => {
    expect(doitSignalerInscription({ created_at: ilYa(8 * 24 * 60 * 60 * 1000), app_metadata: {} }, maintenant)).toBe(false);
  });
});
