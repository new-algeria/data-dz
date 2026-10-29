// Aperçu d'une fiche quand son lien est partagé (WhatsApp, Facebook, X, LinkedIn, Telegram…).
// Les robots des réseaux sociaux n'exécutent pas le JavaScript du site : ils reçoivent une petite page
// HTML avec les balises Open Graph de la donnée (api/partage.ts) et une image générée (api/og.ts).
// Tout ici est pur (aucune requête) pour être testé.

import { CHEMIN_ALGERIE } from "./algerie.js";

type Texte = Partial<Record<"fr" | "en" | "ar", string>> | null | undefined;

/** Ce que l'API renvoie pour une fiche (`GET /v1/datasets/:slug`), réduit aux champs utiles ici. */
export interface FicheApi {
  slug: string;
  titre: Texte;
  description: Texte;
  licence_code?: string | null;
  categorie?: { nom: Texte } | null;
  source?: { nom: string } | null;
  version?: { nb_lignes: number | null } | null;
  ressources?: { telechargements?: { format: string }[]; fichiers?: { format: string }[] }[];
}

export interface ResumePartage {
  slug: string;
  titre: string;
  description: string;
  categorie: string | null;
  source: string | null;
  nbLignes: number | null;
  formats: string[];
}

export const URL_SITE = "https://www.data-dz.com";
export const LARGEUR_IMAGE = 1200;
export const HAUTEUR_IMAGE = 630;

/** Les aperçus sont en anglais (lus partout) ; à défaut, en français. */
const enAnglais = (texte: Texte) => (texte?.en || texte?.fr || texte?.ar || "").trim();

const NOMS_FORMATS: Record<string, string> = { csv: "CSV", xlsx: "Excel", json: "JSON", geojson: "GeoJSON", parquet: "Parquet" };
const ORDRE_FORMATS = ["csv", "xlsx", "json", "geojson", "parquet"];

export function resumerFiche(fiche: FicheApi): ResumePartage {
  const formats = new Set<string>();
  for (const ressource of fiche.ressources ?? []) {
    for (const element of [...(ressource.telechargements ?? []), ...(ressource.fichiers ?? [])]) formats.add(element.format.toLowerCase());
  }
  return {
    slug: fiche.slug,
    titre: enAnglais(fiche.titre) || fiche.slug,
    description: enAnglais(fiche.description),
    categorie: enAnglais(fiche.categorie?.nom) || null,
    source: fiche.source?.nom ?? null,
    nbLignes: fiche.version?.nb_lignes ?? null,
    formats: [...formats].sort((a, b) => ORDRE_FORMATS.indexOf(a) - ORDRE_FORMATS.indexOf(b)).map((format) => NOMS_FORMATS[format] ?? format.toUpperCase()),
  };
}

const formatNombre = new Intl.NumberFormat("en-US");

/** « 3,807 rows » */
export const libelleLignes = (nb: number | null) => (nb === null ? null : `${formatNombre.format(nb)} ${nb === 1 ? "row" : "rows"}`);

const couper = (texte: string, max: number) => (texte.length > max ? `${texte.slice(0, max - 1).trimEnd()}…` : texte);

/** Description courte de l'aperçu : chiffres clés puis début de la description. */
export function descriptionPartage(resume: ResumePartage): string {
  const chiffres = [libelleLignes(resume.nbLignes), resume.formats.join(", ") || null, resume.source ? `Source: ${resume.source}` : null].filter(Boolean).join(" · ");
  return couper([chiffres, resume.description].filter(Boolean).join(" — "), 200);
}

const echapper = (texte: string) =>
  texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Page lue par les robots des réseaux sociaux : balises Open Graph et Twitter, et un lien pour les humains. */
export function htmlPartage(resume: ResumePartage | null, chemin: string, urlImage: string): string {
  const titre = resume ? `${resume.titre} · data-dz` : "data-dz · Open data on Algeria";
  const description = resume ? descriptionPartage(resume) : "Find, map and download public data on Algeria, with its source and licence.";
  const url = `${URL_SITE}${chemin}`;
  const meta = (attribut: "property" | "name", cle: string, valeur: string) => `<meta ${attribut}="${cle}" content="${echapper(valeur)}">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${echapper(titre)}</title>
<meta name="description" content="${echapper(description)}">
<link rel="canonical" href="${echapper(url)}">
${meta("property", "og:type", "website")}
${meta("property", "og:site_name", "data-dz")}
${meta("property", "og:title", titre)}
${meta("property", "og:description", description)}
${meta("property", "og:url", url)}
${meta("property", "og:image", urlImage)}
${meta("property", "og:image:width", String(LARGEUR_IMAGE))}
${meta("property", "og:image:height", String(HAUTEUR_IMAGE))}
${meta("property", "og:image:alt", titre)}
${meta("name", "twitter:card", "summary_large_image")}
${meta("name", "twitter:title", titre)}
${meta("name", "twitter:description", description)}
${meta("name", "twitter:image", urlImage)}
</head>
<body>
<h1>${echapper(titre)}</h1>
<p>${echapper(description)}</p>
<p><a href="${echapper(url)}">${echapper(url)}</a></p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------------------------
// Image 1200 × 630 (éléments au format attendu par Satori / @vercel/og, sans JSX)
// ---------------------------------------------------------------------------------------------

export interface Element {
  type: string;
  props: Record<string, unknown> & { children?: Element | string | (Element | string | null)[] | null };
}

const el = (type: string, props: Record<string, unknown>, ...enfants: (Element | string | null | false)[]): Element => {
  const filtres = enfants.filter((enfant): enfant is Element | string => enfant !== null && enfant !== false);
  return { type, props: { ...props, children: filtres.length === 1 ? filtres[0] : filtres } };
};

const pastille = (texte: string) =>
  el(
    "div",
    { style: { display: "flex", alignItems: "center", padding: "8px 18px", borderRadius: 999, background: "rgba(16,185,129,0.18)", border: "1px solid rgba(110,231,183,0.35)", color: "#a7f3d0", fontSize: 24 } },
    texte
  );

/**
 * Image de partage : logo data-dz, catégorie, titre (en anglais), nombre de lignes, formats, source,
 * adresse de la fiche, et la silhouette de l'Algérie en décor.
 */
export function elementImage(resume: ResumePartage | null, logo: string): Element {
  const titre = resume ? couper(resume.titre, 90) : "Open data on Algeria";
  const tailleTitre = titre.length > 60 ? 58 : titre.length > 36 ? 66 : 76;
  const chiffres = resume ? [libelleLignes(resume.nbLignes), resume.formats.slice(0, 4).join(" · ") || null].filter((valeur): valeur is string => Boolean(valeur)) : [];

  return el(
    "div",
    {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        background: "linear-gradient(135deg, #022c22 0%, #064e3b 55%, #065f46 100%)",
        color: "#ffffff",
        fontFamily: "Inter",
        padding: "56px 64px",
      },
    },
    // Silhouette de l'Algérie, à droite
    el(
      "svg",
      { width: 470, height: 470, viewBox: "0 0 400 400", style: { position: "absolute", right: 30, top: 80, opacity: 0.22 } },
      el("path", { d: CHEMIN_ALGERIE, fill: "#34d399", stroke: "#6ee7b7", strokeWidth: 2 })
    ),
    el(
      "div",
      { style: { display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%" } },
      // Logo
      el(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 18 } },
        el("img", { src: logo, width: 64, height: 64 }),
        el("div", { style: { display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 } }, el("span", {}, "data"), el("span", { style: { color: "#34d399" } }, "-dz")),
        resume?.categorie ? el("div", { style: { display: "flex", marginLeft: 16 } }, pastille(resume.categorie)) : null
      ),
      // Titre et chiffres
      el(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 26, maxWidth: 900 } },
        el("div", { style: { display: "flex", fontSize: tailleTitre, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5 } }, titre),
        chiffres.length > 0
          ? el(
              "div",
              { style: { display: "flex", gap: 14 } },
              ...chiffres.map((chiffre) =>
                el("div", { style: { display: "flex", padding: "10px 20px", borderRadius: 14, background: "rgba(255,255,255,0.1)", fontSize: 28, fontWeight: 800 } }, chiffre)
              )
            )
          : null
      ),
      // Pied : source et adresse
      el(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#a7f3d0" } },
        el("div", { style: { display: "flex" } }, resume?.source ? `Source: ${resume.source}` : "Open data · Algeria"),
        el("div", { style: { display: "flex", color: "#ffffff", fontWeight: 800 } }, resume ? `data-dz.com/datasets/${couper(resume.slug, 40)}` : "data-dz.com")
      )
    )
  );
}
