// Régénère src/lib/photos-wilayas.json : photos des wilayas tirées de Wikidata (Wikimedia Commons).
// Pour chaque wilaya : bannière Wikivoyage (P948) du chef-lieu puis de la wilaya, image principale (P18) de la wilaya
// puis du chef-lieu ; 4 au plus. Les identifiants Wikidata (wilaya, chef-lieu) sont déjà dans le fichier : on les relit.
// Usage : node scripts/photos-wilayas.mjs (accès à www.wikidata.org nécessaire).
import { readFileSync, writeFileSync } from "node:fs";

const FICHIER = "src/lib/photos-wilayas.json";
const ENTETES = { "User-Agent": "data-dz/1.0 (https://www.data-dz.com)" };
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function entite(qid) {
  if (!qid) return null;
  const reponse = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: ENTETES });
  if (!reponse.ok) throw new Error(`${qid} : HTTP ${reponse.status}`);
  const { entities } = await reponse.json();
  return entities[qid] ?? Object.values(entities)[0];
}

const valeurs = (entite, propriete) =>
  (entite?.claims?.[propriete] ?? []).filter((c) => c.rank !== "deprecated").map((c) => c.mainsnak?.datavalue?.value).filter((v) => typeof v === "string");

const wilayas = JSON.parse(readFileSync(FICHIER, "utf8"));
for (const [code, wilaya] of Object.entries(wilayas)) {
  const [w, chef] = [await entite(wilaya.wikidata), await entite(wilaya.chef_lieu)];
  const photos = [...valeurs(chef, "P948"), ...valeurs(w, "P948"), ...valeurs(w, "P18"), ...valeurs(chef, "P18")];
  wilaya.photos = [...new Set(photos)].slice(0, 4);
  console.log(code, wilaya.photos.length);
  await attendre(300);
}
writeFileSync(FICHIER, `${JSON.stringify(wilayas, null, 1)}\n`);
