// Page servie aux robots des réseaux sociaux pour /datasets/:slug (règle « rewrites » de vercel.json) :
// balises Open Graph de la donnée, en anglais, avec l'image générée par /api/og.
import { htmlPartage, resumerFiche } from "./_partage/apercu.js";
import { chargerFiche, slugValide } from "./_partage/fiche.js";

export const config = { runtime: "edge" };

export default async function handler(requete: Request): Promise<Response> {
  const url = new URL(requete.url);
  const slug = url.searchParams.get("slug");
  const fiche = slugValide(slug) ? await chargerFiche(slug) : null;
  const urlImage = `${url.origin}/api/og${fiche ? `?slug=${encodeURIComponent(fiche.slug)}` : ""}`;
  const html = htmlPartage(fiche ? resumerFiche(fiche) : null, slugValide(slug) ? `/datasets/${slug}` : "/", urlImage);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
