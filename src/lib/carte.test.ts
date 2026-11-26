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

  it("n'affiche ni les champs techniques d'OpenStreetMap (@id, @geometry) ni ceux de la synchro (doublon, wilaya codée, absence)", () => {
    const champs = champsLisibles(
      { "@id": "node/1", name: "Mosquée El Fath", doublon_probable: "way/2", code_wilaya: "16", osm_absent_depuis: "2026-11-01", wilaya: "Alger", "@geometry": "center" },
      "fr"
    );
    expect(champs.map(([cle]) => cle)).toEqual(["name", "wilaya"]);
  });

  it("préfère le nom remis en forme et n'affiche pas deux fois le même nom à la casse près", () => {
    const champs = champsLisibles({ "@id": "node/1", name: "PHARMACIE BENALI", nom_affiche: "Pharmacie Benali", "addr:street": "Rue Larbi Ben M'hidi", qualite: 2 }, "fr");
    expect(champs).toEqual([
      ["nom_affiche", "Pharmacie Benali"],
      ["addr:street", "Rue Larbi Ben M'hidi"],
    ]);
  });
});
