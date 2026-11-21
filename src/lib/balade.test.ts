import { describe, expect, it } from "vitest";
import {
  angleGlisser,
  angleLePlusProche,
  angleMolette,
  cibleVoisine,
  decalageMarche,
  EMPLACEMENTS_EXT,
  EMPLACEMENTS_INT,
  facteurLissage,
  interpolerPose,
  ordreBalade,
  PAS,
  poseFocus,
  poseMarche,
  RAYON_EXT,
  RAYON_INT,
  regardDepuisPose,
  repartirEmplacements,
  sortieExpo,
} from "./balade";

const proche = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("repartirEmplacements", () => {
  it("60 emplacements : 36 à droite puis 24 à gauche, chaque donnée une fois quand il y en a 60", () => {
    const emplacements = repartirEmplacements(60);
    expect(emplacements).toHaveLength(EMPLACEMENTS_EXT + EMPLACEMENTS_INT);
    expect(emplacements.filter((e) => e.mur === "ext")).toHaveLength(36);
    expect(new Set(emplacements.map((e) => e.indice)).size).toBe(60);
  });

  it("la liste recommence quand il y a moins de données", () => {
    const emplacements = repartirEmplacements(7);
    expect(emplacements[7].indice).toBe(0);
    expect(emplacements[36]).toMatchObject({ mur: "int", indice: 36 % 7 });
  });

  it("le pilier est décalé d'un demi-pas", () => {
    const pilier = repartirEmplacements(10).find((e) => e.mur === "int");
    proche(pilier!.angle, Math.PI / EMPLACEMENTS_INT);
  });

  it("aucune donnée : aucun tableau", () => {
    expect(repartirEmplacements(0)).toEqual([]);
  });
});

describe("poses", () => {
  it("marche : dans le couloir, regard un peu vers le pilier", () => {
    const pose = poseMarche(0, { portrait: false });
    expect(pose.r).toBeGreaterThan(RAYON_INT);
    expect(pose.r).toBeLessThan(RAYON_EXT);
    expect(pose.yaw).toBeLessThan(0);
  });

  it("focus : face au mur, à droite pour l'extérieur, à gauche pour le pilier", () => {
    expect(poseFocus("ext", 1, { portrait: false })).toMatchObject({ th: 1, yaw: Math.PI / 2 });
    expect(poseFocus("int", 1, { portrait: false }).yaw).toBe(-Math.PI / 2);
    expect(poseFocus("ext", 0, { portrait: true }).r).toBeLessThan(poseFocus("ext", 0, { portrait: false }).r);
  });

  it("le point visé est devant la caméra, dans l'axe du couloir quand le lacet est nul", () => {
    const { position, cible } = regardDepuisPose({ th: 0, r: 15, yaw: 0, y: 2, pitch: 0 });
    expect(position).toEqual([15, 2, 0]);
    proche(cible[0], 15);
    proche(cible[2], -1);
  });

  it("décalage de marche plus grand en portrait", () => {
    expect(decalageMarche({ portrait: true })).toBeGreaterThan(decalageMarche({ portrait: false }));
  });
});

describe("déplacements", () => {
  it("angleLePlusProche prend le chemin le plus court", () => {
    proche(angleLePlusProche(0.1, 2 * Math.PI + 0.2), 2 * Math.PI + 0.1);
    proche(angleLePlusProche(6, 0), 6 - 2 * Math.PI);
  });

  it("cibleVoisine avance d'un pas (l'angle diminue) et se cale sur la grille", () => {
    const d = 0.14;
    proche(cibleVoisine(d, 1, d), d - PAS);
    proche(cibleVoisine(d + 0.3 * PAS, -1, d), d + PAS);
  });

  it("molette vers le bas et glisser vers la gauche font avancer", () => {
    expect(angleMolette(100, false)).toBeLessThan(0);
    expect(angleMolette(3, true)).toBeCloseTo(angleMolette(99, false));
    expect(angleGlisser(-50, 10, false)).toBeLessThan(0);
    expect(angleGlisser(5, -80, true)).toBeCloseTo(-80 * 0.0042);
  });

  it("lissage et courbes bornés entre 0 et 1", () => {
    expect(facteurLissage(0)).toBe(0);
    expect(facteurLissage(10)).toBeCloseTo(1);
    expect(sortieExpo(1)).toBe(1);
  });

  it("interpolerPose part de la pose de départ et arrive sur la pose visée", () => {
    const a = poseMarche(0, { portrait: false });
    const b = poseFocus("ext", 0.5, { portrait: false });
    expect(interpolerPose(a, b, 0)).toEqual(a);
    expect(interpolerPose(a, b, 1)).toEqual(b);
    // Le déplacement mène, la rotation suit.
    const milieu = interpolerPose(a, b, 0.3);
    expect((milieu.th - a.th) / (b.th - a.th)).toBeGreaterThan((milieu.yaw - a.yaw) / (b.yaw - a.yaw));
  });
});

describe("ordreBalade", () => {
  it("plus téléchargées d'abord, puis plus vues, 60 au plus", () => {
    const d = (slug: string, nb_telechargements: number, nb_vues = 0) => ({ slug, nb_telechargements, nb_vues });
    expect(ordreBalade([d("a", 1), d("b", 5), d("c", 1, 9)]).map((x) => x.slug)).toEqual(["b", "c", "a"]);
    expect(ordreBalade(Array.from({ length: 80 }, (_, i) => d(String(i), i)))).toHaveLength(60);
  });
});
