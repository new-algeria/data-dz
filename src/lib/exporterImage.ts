// Export d'un graphique SVG (Recharts) en image PNG, avec son titre et sa source.

// Propriétés recopiées depuis le rendu réel : les couleurs du graphique sont des variables CSS,
// qu'une image isolée ne saurait pas résoudre.
const PROPRIETES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
] as const;

function recopierStyles(original: Element, copie: Element) {
  const calcule = getComputedStyle(original);
  const style = PROPRIETES.map((propriete) => `${propriete}:${calcule.getPropertyValue(propriete)}`).join(";");
  copie.setAttribute("style", style);
  for (let indice = 0; indice < original.children.length; indice++) recopierStyles(original.children[indice], copie.children[indice]);
}

const echapper = (texte: string) => texte.replace(/[&<>"]/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[caractere] ?? caractere);

interface OptionsImage {
  titre: string;
  source: string | null;
  /** Couleurs du thème affiché (fond, texte). */
  fond: string;
  texte: string;
  rtl: boolean;
}

/** Télécharge le graphique en PNG (2× pour les écrans haute densité). */
export async function telechargerGraphiquePng(svg: SVGSVGElement, nomFichier: string, options: OptionsImage): Promise<void> {
  const { width: largeur, height: hauteur } = svg.getBoundingClientRect();
  const copie = svg.cloneNode(true) as SVGSVGElement;
  recopierStyles(svg, copie);

  const marge = 16;
  const enTete = 40;
  const pied = options.source ? 28 : 8;
  const total = { largeur: Math.round(largeur + marge * 2), hauteur: Math.round(hauteur + enTete + pied) };
  const ancre = options.rtl ? "end" : "start";
  const x = options.rtl ? total.largeur - marge : marge;

  copie.setAttribute("x", String(marge));
  copie.setAttribute("y", String(enTete));
  copie.setAttribute("width", String(largeur));
  copie.setAttribute("height", String(hauteur));

  const police = "Inter, system-ui, sans-serif";
  const contenu = `<svg xmlns="http://www.w3.org/2000/svg" width="${total.largeur}" height="${total.hauteur}" direction="${options.rtl ? "rtl" : "ltr"}">
    <rect width="100%" height="100%" fill="${options.fond}"/>
    <text x="${x}" y="26" text-anchor="${ancre}" fill="${options.texte}" font-family="${police}" font-size="15" font-weight="600">${echapper(options.titre)}</text>
    ${new XMLSerializer().serializeToString(copie)}
    ${
      options.source
        ? `<text x="${x}" y="${total.hauteur - 10}" text-anchor="${ancre}" fill="${options.texte}" fill-opacity="0.65" font-family="${police}" font-size="11">${echapper(options.source)}</text>`
        : ""
    }
  </svg>`;

  const url = URL.createObjectURL(new Blob([contenu], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await new Promise<HTMLImageElement>((resoudre, rejeter) => {
      const element = new Image();
      element.onload = () => resoudre(element);
      element.onerror = rejeter;
      element.src = url;
    });
    const echelle = 2;
    const canvas = document.createElement("canvas");
    canvas.width = total.largeur * echelle;
    canvas.height = total.hauteur * echelle;
    const contexte = canvas.getContext("2d");
    if (!contexte) throw new Error("canvas indisponible");
    contexte.scale(echelle, echelle);
    contexte.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resoudre) => canvas.toBlob(resoudre, "image/png"));
    if (!blob) throw new Error("export PNG impossible");
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = nomFichier.endsWith(".png") ? nomFichier : `${nomFichier}.png`;
    lien.click();
    setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
