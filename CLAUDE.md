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

## Authentification
Supabase Auth côté navigateur, en **flux PKCE** avec session persistante (`src/lib/supabase.ts`).
Les liens des emails et de Google reviennent avec un `?code=` que supabase-js échange au chargement (`detectSessionInUrl`) : un lien doit être ouvert **dans le navigateur où il a été demandé**.

| Route | Rôle |
|---|---|
| `/connexion` | Email + mot de passe, lien magique (`signInWithOtp`, sans création de compte), « Continuer avec Google » (désactivé tant que Google n'est pas activé dans Supabase, lu via `/auth/v1/settings`) |
| `/inscription` | Email + mot de passe (8 caractères minimum, confirmation), puis « vérifiez votre boîte mail » |
| `/mot-de-passe-oublie` | Envoie le lien de réinitialisation (`resetPasswordForEmail`) |
| `/nouveau-mot-de-passe` | Arrivée du lien : événement `PASSWORD_RECOVERY`, puis `updateUser({ password })` ; accessible aussi à un membre connecté |
| `/auth/retour` | Finalise la session (`?code=` PKCE, ou `?token_hash=&type=` via `verifyOtp`), traduit les erreurs de l'URL, puis renvoie vers `?suite=` |
| `/profil` | Protégée (`RouteProtegee`) : pseudo, nom affiché, bio, site web, avatar |
| `/membres/:pseudo` | Page publique d'un membre ; 404 propre si le pseudo n'existe pas |

- **Redirections** : tous les `emailRedirectTo` / `redirectTo` sont construits avec `window.location.origin` (`urlRetour()` dans `src/lib/auth.ts`), donc ils marchent en local, sur les aperçus Vercel et en production. Chaque origine doit être autorisée dans Supabase → Authentication → URL Configuration.
- **Page d'origine** : `RouteProtegee` envoie vers `/connexion?suite=<page>` ; `suiteSure()` n'accepte que des chemins internes (pas de redirection ouverte).
- **Contexte** : `FournisseurAuth` (`src/contexte/`) suit `onAuthStateChange` et charge le profil avec React Query (clé `["profil", id]`). Dans les composants : `const { session, utilisateur, profil, chargement, recuperation } = useAuth()`. Ne jamais appeler Supabase à l'intérieur du rappel `onAuthStateChange`.
- **Profil** : un membre ne peut modifier que `pseudo`, `nom_affiche`, `avatar_url`, `bio`, `site_web` sur sa propre ligne (droits de la base). Le pseudo est forcé en minuscules et vérifié avant l'envoi : format `^[a-z0-9_-]{3,30}$`, `rpc("pseudo_reserve", { pseudo })`, disponibilité. Site web en `http(s)://`, bio ≤ 500, nom ≤ 80.
- **Erreurs** : `cleErreur()` (`src/lib/erreurs.ts`) traduit les codes Supabase en clés `erreurs.*` : `invalid_credentials`, `email_not_confirmed`, compte existant, `weak_password`, limite de tentatives (429), `23505` (pseudo pris), `23514` (contrainte : pseudo réservé ou invalide, site web…).

### Avatars
- Bucket Supabase Storage **`avatars`** : public, 2 Mo maximum, `image/png`, `image/jpeg`, `image/webp`, `image/gif`.
- Chemin imposé : **`avatars/<id utilisateur>/avatar-<horodatage>.<ext>`**. La RLS du stockage n'autorise chacun qu'à écrire dans son propre dossier.
- Ordre (`envoyerAvatar()` dans `src/lib/profils.ts`) : contrôle du type et de la taille avant l'envoi → envoi → `avatar_url` = URL publique → suppression de l'ancien fichier s'il est dans le dossier du membre. Si la mise à jour du profil échoue, le nouveau fichier est supprimé.
- `avatar_url` doit être en `https://` (contrainte de la base). Sans avatar, le site affiche les initiales.

### Développement local
- `supabase/config.toml` : `site_url = "http://localhost:5173"`, redirections `http://localhost:5173/**`, mot de passe de 8 caractères, confirmation d'email activée (emails visibles dans Mailpit).
- `npx supabase start` puis `npx supabase db reset` applique `supabase/migrations/` et charge `supabase/seed.sql`. Les migrations déjà appliquées en production ne doivent jamais être modifiées : toute évolution passe par un nouveau fichier.

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
