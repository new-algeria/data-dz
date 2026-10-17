# data-dz v2

Portail open source de données sur l'Algérie, porté par New Algeria (newalgeria.org).
Ce dépôt est **public** : aucun secret ne doit jamais y être commité.

Commandes : `npm install`, `npm run dev`, `npm run build`, `npm run lint`.
Variables d'environnement : voir `.env.example` (copier en `.env.local`).

# Référence du projet

## Architecture
```
Navigateur (data-dz, site statique React)
  ├── Supabase (Postgres + Auth + API REST)     → catalogue, comptes, profils
  └── Cloudflare R2 (https://files.data-dz.com) → fichiers bruts, lecture publique
```
- Pas de backend maison. api-dz-backend et RapidAPI sont abandonnés.
- R2 range les fichiers par format : `json/<nom>.json`, `geojson/<nom>.geojson`, `meta/…`, `licences/<paquet>.txt`. URL d'un fichier = `${VITE_URL_FICHIERS}/${cle_stockage}`.
- Les données GeoAlgeria sont synchronisées chaque semaine par un script externe qui remplit R2 et Supabase. Le site ne fait que lire.
- Hébergement : Vercel (équipe new-algeria, projet data-dz). Seule la branche `main` part en production.

## Tables Supabase (lecture seule pour le site)
| Table | Contenu |
|---|---|
| `profils` | 1 ligne par compte (`id` = `auth.users.id`) : `pseudo`, `nom_affiche`, `avatar_url`, `bio`, `site_web`, `role` (`membre`, `contributeur`, `moderateur`, `admin`), `reputation` |
| `categories` | `slug`, `nom` (jsonb `{fr,en,ar}`), `icone`, `ordre` |
| `licences` | `code` (ex. `ODbL-1.0`), `nom`, `url`, `usage_commercial`, `attribution_requise`, `partage_identique` |
| `sources` | `slug`, `nom`, `url`, `type`, `verifiee` |
| `datasets` | `slug`, `titre` et `description` (jsonb `{fr,en,ar}`, pas toujours complets), `readme` (Markdown), `categorie_slug`, `source_id`, `licence_code`, `licence_details`, `url_source`, `mots_cles[]`, `wilayas[]`, `statut` (`publie`…), `version_courante_id`, `infos_source` (jsonb), `recherche` (tsvector) |
| `versions` | `dataset_id`, `numero`, `notes`, `nb_lignes`, `colonnes` (jsonb `[{nom, type}]`), `apercu` (jsonb, 3 lignes), `publie_le` |
| `fichiers` | `version_id`, `format` (`json`, `geojson`, `csv`…), `cle_stockage`, `nom`, `principal`, `taille_octets` |

Requête type :
```ts
const { data, error } = await supabase
  .from("datasets")
  .select(`
    slug, titre, description, categorie_slug, licence_code, licence_details, url_source, mots_cles, infos_source,
    sources ( nom, url ),
    versions!datasets_version_courante_fk (
      numero, nb_lignes, colonnes, apercu, publie_le,
      fichiers ( nom, format, cle_stockage, principal, taille_octets )
    )
  `)
  .eq("statut", "publie")
  .order("titre->>fr");
```
Recherche : `.textSearch("recherche", terme, { config: "simple", type: "websearch" })`.

## Sécurité
- La RLS est active partout : un visiteur ne voit que les données publiées. Ne jamais essayer de la contourner.
- Seule la clé publishable va dans le site. La clé service_role / secret ne doit JAMAIS apparaître dans ce dépôt.

## Attribution GeoAlgeria (obligatoire)
Sur les fiches dont la source est `geoalgeria`, afficher : « Données : GeoAlgeria par Yasser's studio » avec un lien vers https://geoalgeria.com, la licence (`licence_code` + `licence_details`) et un lien vers `url_source`. Les données OpenStreetMap sont sous ODbL (citation obligatoire). Un signalement d'erreur renvoie vers https://github.com/yasserstudio/geoalgeria/issues. Ne pas copier le design de geoalgeria.com.

## Conventions
- Noms de variables, fonctions et composants métier en **français** (`listeDonnees`, `chargerCatalogue`, `FicheDonnee`). Les noms imposés par les bibliothèques restent en anglais.
- Tous les textes visibles passent par i18next (`fr`, `en`, `ar`), jamais en dur.
- Pas de chiffres, partenaires ou logos inventés.
- Petits commits clairs.

## Feuille de route
1. Catalogue en lecture (liste, recherche, filtres).
2. Fiche détail (README, colonnes, aperçu, carte GeoJSON, téléchargements, attribution).
3. Authentification email + Google, page profil.
4. Espace modération (brouillons, publication).
5. Plus tard : soumissions communautaires, votes, commentaires, favoris, pack de téléchargement (zip + datapackage.json).
