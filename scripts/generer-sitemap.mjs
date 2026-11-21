// Génère dist/sitemap.xml après le build : pages fixes + fiches publiées (lues avec la clé publishable, comme le site).
// Si Supabase est injoignable, le sitemap ne contient que les pages fixes : le build ne doit jamais échouer pour ça.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const URL_SITE = "https://www.data-dz.com";
const PAGES_FIXES = ["/", "/themes", "/wilayas", "/djazai", "/api", "/ai-datasets", "/walk", "/privacy", "/terms"];
const URL_API = (lireVariable("VITE_URL_API") ?? "https://api.data-dz.com").replace(/\/+$/, "");

/** Lit les variables VITE_* depuis l'environnement (Vercel) ou, en local, depuis .env.local / .env. */
function lireVariable(nom) {
  if (process.env[nom]) return process.env[nom];
  for (const fichier of [".env.local", ".env"]) {
    if (!existsSync(fichier)) continue;
    const ligne = readFileSync(fichier, "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${nom}=`));
    if (ligne) return ligne.slice(nom.length + 1).trim();
  }
  return undefined;
}

async function chargerDonneesPubliees() {
  const url = lireVariable("VITE_SUPABASE_URL");
  const cle = lireVariable("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !cle) throw new Error("VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY manquant");
  const reponse = await fetch(`${url}/rest/v1/datasets?select=slug,mis_a_jour_le&statut=eq.publie&order=slug`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return reponse.json();
}

// Pages « Ma wilaya » : même identifiant que identifiantWilaya() (src/lib/wilayas.ts), « 16-alger ».
const slugTexte = (texte) =>
  texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function chargerIdentifiantsWilayas() {
  const codes = Array.from({ length: 69 }, (_, i) => String(i + 1).padStart(2, "0"));
  try {
    const reponse = await fetch(`${URL_API}/v1/datasets/divisions-administratives/data?file=wilayas&limit=100`, { signal: AbortSignal.timeout(10_000) });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const noms = new Map((await reponse.json()).data.map((w) => [String(w.code).padStart(2, "0"), String(w.name_fr ?? "")]));
    return codes.map((code) => (slugTexte(noms.get(code) ?? "") ? `${code}-${slugTexte(noms.get(code))}` : code));
  } catch (erreur) {
    // Sans les noms, les URL courtes « /wilayas/16 » mènent aussi à la bonne page.
    console.warn(`⚠️  sitemap : noms des wilayas indisponibles (${erreur.message})`);
    return codes;
  }
}

const echapper = (texte) => texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let donnees = [];
try {
  donnees = await chargerDonneesPubliees();
} catch (erreur) {
  console.warn(`⚠️  sitemap : fiches non incluses (${erreur.message})`);
}

const wilayas = await chargerIdentifiantsWilayas();

const entrees = [
  ...PAGES_FIXES.map((chemin) => ({ loc: `${URL_SITE}${chemin}` })),
  ...wilayas.map((identifiant) => ({ loc: `${URL_SITE}/wilayas/${identifiant}` })),
  ...donnees.map((d) => ({
    loc: `${URL_SITE}/datasets/${encodeURIComponent(d.slug)}`,
    lastmod: d.mis_a_jour_le ? d.mis_a_jour_le.slice(0, 10) : undefined,
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entrees
  .map((e) => `  <url><loc>${echapper(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`)
  .join("\n")}
</urlset>
`;

writeFileSync("dist/sitemap.xml", xml);
console.log(`✓ sitemap.xml : ${entrees.length} URL (${donnees.length} fiches)`);
