// Image de partage d'une donnée (1200 × 630) : /api/og?slug=<slug>. Sans slug : image générale du site.
import { ImageResponse } from "@vercel/og";
import { elementImage, HAUTEUR_IMAGE, LARGEUR_IMAGE, resumerFiche } from "./_partage/apercu.js";
import { chargerFiche, slugValide } from "./_partage/fiche.js";

export const config = { runtime: "edge" };

// Polices embarquées avec la fonction (Inter, SIL Open Font License).
const inter400 = fetch(new URL("./_partage/polices/inter-400.woff", import.meta.url)).then((reponse) => reponse.arrayBuffer());
const inter800 = fetch(new URL("./_partage/polices/inter-800.woff", import.meta.url)).then((reponse) => reponse.arrayBuffer());

export default async function handler(requete: Request): Promise<Response> {
  const url = new URL(requete.url);
  const slug = url.searchParams.get("slug");
  const [fiche, normal, gras] = await Promise.all([slugValide(slug) ? chargerFiche(slug) : null, inter400, inter800]);
  const element = elementImage(fiche ? resumerFiche(fiche) : null, `${url.origin}/data_dz_logo_icon.png`);
  // Les éléments sont au format React attendu par Satori, construits sans JSX.
  return new ImageResponse(element as unknown as ConstructorParameters<typeof ImageResponse>[0], {
    width: LARGEUR_IMAGE,
    height: HAUTEUR_IMAGE,
    fonts: [
      { name: "Inter", data: normal, weight: 400, style: "normal" },
      { name: "Inter", data: gras, weight: 800, style: "normal" },
    ],
    headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
