import { describe, expect, it } from "vitest";
import { fichiersWilaya, lirePhotosCommons, photoSimple, texteSansHtml, urlPageFichier, urlVignette } from "./photos-wilayas";

describe("photos des wilayas", () => {
  it("a des photos pour presque toutes les wilayas, 4 au plus", () => {
    const codes = Array.from({ length: 69 }, (_, i) => String(i + 1).padStart(2, "0"));
    const avecPhotos = codes.filter((code) => fichiersWilaya(code).length > 0);
    expect(avecPhotos.length).toBeGreaterThanOrEqual(60);
    expect(codes.every((code) => fichiersWilaya(code).length <= 4)).toBe(true);
    expect(fichiersWilaya("99")).toEqual([]);
  });

  it("construit les adresses Commons des fichiers", () => {
    expect(urlVignette("Alger banner.jpg", 800)).toBe("https://commons.wikimedia.org/wiki/Special:FilePath/Alger_banner.jpg?width=800");
    expect(urlPageFichier("Ksar Chellala قصر الشلالة 2.jpg")).toBe(
      `https://commons.wikimedia.org/wiki/File:${encodeURIComponent("Ksar_Chellala_قصر_الشلالة_2.jpg")}`
    );
  });

  it("lit l'auteur sans HTML", () => {
    expect(texteSansHtml('<a href="//commons.wikimedia.org/wiki/User:Clapsus">Clapsus</a>')).toBe("Clapsus");
    expect(texteSansHtml("Smith &amp; Co")).toBe("Smith & Co");
    expect(texteSansHtml("<span></span>")).toBeNull();
    expect(texteSansHtml(undefined)).toBeNull();
    expect(texteSansHtml("x".repeat(100))?.length).toBe(78);
  });

  it("associe la réponse de Commons aux fichiers demandés, dans l'ordre", () => {
    const photos = lirePhotosCommons(
      {
        query: {
          normalized: [{ from: "File:Alger_banner.jpg", to: "File:Alger banner.jpg" }],
          pages: [
            { title: "File:Absent.jpg", missing: true },
            {
              title: "File:Argel 3.jpg",
              imageinfo: [{ thumburl: "https://upload.wikimedia.org/a.jpg", thumbwidth: 1280, thumbheight: 853, descriptionurl: "https://commons.wikimedia.org/wiki/File:Argel_3.jpg", extmetadata: { Artist: { value: "<b>Ana</b>" }, LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" } } }],
            },
            { title: "File:Alger banner.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/b.jpg", extmetadata: { LicenseUrl: { value: "javascript:alert(1)" } } }] },
          ],
        },
      },
      ["Alger_banner.jpg", "Argel 3.jpg", "Absent.jpg", "Inconnu.jpg"]
    );
    expect(photos.map((p) => p.fichier)).toEqual(["Alger_banner.jpg", "Argel 3.jpg"]);
    expect(photos[1]).toMatchObject({ auteur: "Ana", licence: "CC BY-SA 4.0", largeur: 1280, hauteur: 853 });
    expect(photos[0].urlLicence).toBeNull();
  });

  it("garde un repli sans crédits", () => {
    expect(photoSimple("A b.jpg")).toMatchObject({ vignette: urlVignette("A b.jpg"), page: urlPageFichier("A b.jpg"), auteur: null });
  });
});
