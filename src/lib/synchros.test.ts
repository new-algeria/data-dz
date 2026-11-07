import { describe, expect, it } from "vitest";
import { lireTagSaisi, nomsProposes, tagLisible } from "./synchros";

describe("tags OpenStreetMap saisis dans l'administration", () => {
  it("lit clé et valeurs, sans doublons ni espaces autour", () => {
    expect(lireTagSaisi(" tourism = hotel, motel ,hotel")).toEqual({ cle: "tourism", valeurs: ["hotel", "motel"] });
    expect(lireTagSaisi("amenity=cafe")).toEqual({ cle: "amenity", valeurs: ["cafe"] });
  });

  it("refuse une clé seule, une majuscule, un caractère dangereux", () => {
    for (const texte of ["building", "amenity=", "Amenity=cafe", 'amenity=ca"fe', "a=b=c", "amenity=cafe;bar"]) expect(lireTagSaisi(texte), texte).toBeNull();
  });

  it("propose code et nom de fichier", () => {
    expect(nomsProposes(["camp_site"], true)).toEqual({ code: "camp-site", fichier: "camp-site-osm" });
    expect(nomsProposes(["camp_site"], false)).toEqual({ code: "camp-site", fichier: "camp_site" });
    expect(tagLisible("nwr/tourism=hotel,motel")).toBe("tourism=hotel,motel");
  });
});
