import { describe, expect, it } from "vitest";
import { champsLisibles } from "./carte";

describe("popup de la carte", () => {
  const pharmacie = {
    id: "01-00001",
    name: "Pharmacie El Amel",
    name_fr: "Pharmacie El Amel",
    name_ar: "صيدلية الأمل",
    wilaya_code: "01",
    commune_code: "0112",
    commune: "Aoulef",
    geo_precision: "exact",
    geo_method: "osm_node",
    source: "osm",
    address: "Rue du 1er Novembre",
    lat: 26.97,
  };

  it("garde les 3 premiers champs texte lisibles, sans doublon ni identifiant technique", () => {
    expect(champsLisibles(pharmacie, "fr")).toEqual([
      ["name", "Pharmacie El Amel"],
      ["address", "Rue du 1er Novembre"],
      ["commune", "Aoulef"],
    ]);
  });

  it("met le nom arabe en premier en arabe", () => {
    expect(champsLisibles(pharmacie, "ar")[0]).toEqual(["name_ar", "صيدلية الأمل"]);
  });
});
