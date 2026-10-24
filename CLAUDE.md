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

## Routes (URL en anglais)
Toutes les URL sont en anglais ; les noms de variables et de composants restent en français. Les chemins sont centralisés dans `src/lib/routes.ts` (`routes.donnee(slug)`, `routes.profil`…) : ne jamais écrire un chemin en dur.

| Route | Page | Accès |
|---|---|---|
| `/` (ancre `#catalog`, filtres `?q=`, `?category=`, tri `?sort=top\|recent\|name`) | Accueil et catalogue | public |
| `/datasets/:slug` (ancres `#comments`, `#comment-<id>`) | Fiche d'une donnée, votes, favori, commentaires | public |
| `/members/:username` | Page publique d'un membre | public |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | Authentification (voir ci-dessous) | public |
| `/profile` | Mon profil | connecté |
| `/favorites` | Mes favoris (données suivies) | connecté |
| `/submit` | Proposer une donnée | connecté |
| `/my-submissions`, `/my-submissions/:id` | Mes propositions, détail | connecté |
| `/moderation` (`?status=`) | File des propositions | modérateur / admin |
| `/moderation/submissions/:id` | Revue d'une proposition | modérateur / admin |
| `/moderation/datasets` | Statut des datasets (publié / brouillon / archivé) | modérateur / admin |
| `/admin/users` | Gestion des membres et de leurs rôles | admin |
| `/privacy`, `/terms` | Pages légales | public |

- **Anciennes URL françaises** (`/donnees/:slug`, `/dataset/:slug`, `/membres/:pseudo`, `/profil`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe`, `/auth/retour`, `/confidentialite`, `/conditions`) : redirection vers la nouvelle URL en gardant `?…` et `#…` (indispensable pour les liens d'email déjà envoyés).
- **Page d'origine** : paramètre `?next=` (l'ancien `?suite=` est encore lu).
- **SEO** : balise `canonical` sur chaque page (`MetaTags.tsx`), `public/robots.txt`, `dist/sitemap.xml` généré après la build par `scripts/generer-sitemap.mjs` (fiches publiées lues avec la clé publishable ; sans accès à Supabase, seules les pages fixes y figurent).

## Authentification
Supabase Auth côté navigateur, en **flux PKCE** avec session persistante (`src/lib/supabase.ts`).
Les liens des emails et de Google reviennent avec un `?code=` que supabase-js échange au chargement (`detectSessionInUrl`) : un lien doit être ouvert **dans le navigateur où il a été demandé**.

| Route | Rôle |
|---|---|
| `/login` | Email + mot de passe, lien magique (`signInWithOtp`, sans création de compte), « Continuer avec Google » (désactivé tant que Google n'est pas activé dans Supabase, lu via `/auth/v1/settings`) |
| `/signup` | Email + mot de passe (8 caractères minimum, confirmation), puis « vérifiez votre boîte mail » |
| `/forgot-password` | Envoie le lien de réinitialisation (`resetPasswordForEmail`) |
| `/reset-password` | Arrivée du lien : événement `PASSWORD_RECOVERY`, puis `updateUser({ password })` ; accessible aussi à un membre connecté |
| `/auth/callback` | Finalise la session (`?code=` PKCE, ou `?token_hash=&type=` via `verifyOtp`), traduit les erreurs de l'URL, puis renvoie vers `?next=` |
| `/profile` | Protégée (`RouteProtegee`) : pseudo, nom affiché, bio, site web, avatar |
| `/members/:username` | Page publique d'un membre ; 404 propre si le pseudo n'existe pas |

- **Redirections** : tous les `emailRedirectTo` / `redirectTo` sont construits avec `window.location.origin` (`urlRetour()` dans `src/lib/auth.ts`), donc ils marchent en local, sur les aperçus Vercel et en production. Chaque origine doit être autorisée dans Supabase → Authentication → URL Configuration.
- **Page d'origine** : `RouteProtegee` envoie vers `/login?next=<page>` ; `suiteSure()` n'accepte que des chemins internes (pas de redirection ouverte).
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

## Propositions et modération
Migrations `20261019000005_communaute.sql` et `20261022000006_liens_anglais.sql` (déjà en production, ne pas les modifier). Le site n'écrit que les champs de contenu ; statut, revue et publication passent par les fonctions `rpc`. Code : `src/lib/soumissions.ts`, `src/lib/moderation.ts`, `src/lib/apercu.ts`, `src/pages/propositions/`, `src/pages/moderation/`.

- **Statuts** (`soumissions.statut`) : `en_attente` → `modifications_demandees` ⇄ `en_attente` (`rpc("renvoyer_soumission")`) ; `acceptee` / `refusee` (`rpc("decider_soumission", { soumission_id, decision, commentaire })`, commentaire obligatoire pour refuser ou demander des modifications) ; `retiree` (`rpc("retirer_soumission")`) ; `publiee` uniquement par le script d'administration (`marquer_soumission_publiee`, service_role). Une proposition `acceptee` s'affiche « En attente de mise en ligne ».
- **Modification** par l'auteur (contenu et fichiers) tant que le statut est `en_attente` ou `modifications_demandees`. **5 propositions en cours** au maximum : vérifié avant l'envoi avec `rpc("nb_soumissions_en_cours")` (la RLS refuse aussi).
- **Mise à jour d'une donnée** : impossible pour les sources synchronisées (`sources.type = 'synchronisee'`, GeoAlgeria) ; le site propose à la place de signaler l'erreur à GeoAlgeria.
- **Envoi** : ligne `soumissions` d'abord, puis chaque fichier dans le bucket privé **`soumissions`** au chemin **`<uid>/<id proposition>/<nom-nettoyé>`** (contenu brut + `contentType` explicite : avec un `File`, supabase-js ignore `contentType`), puis la ligne `soumission_fichiers` (le fichier est supprimé si elle échoue). Formats : csv, json, geojson (`application/geo+json`), xlsx, xml, zip, pdf ; 50 Mo maximum, vérifiés avant l'envoi.
- **Modération** : `rpc("est_moderateur")` (hook `useEstModerateur`) décide de l'affichage de `RouteModerateur` et du lien « Modération » de l'en-tête (avec le nombre en attente) ; la RLS et les fonctions de la base restent seules juges. Fichiers lus par URL signée (10 minutes) ; aperçu des 20 premières lignes pour CSV (lecture partielle) et JSON / GeoJSON (10 Mo maximum). Un modérateur ne décide pas de sa propre proposition (un admin le peut).
- **Clés React Query** : `["mes-soumissions", uid]`, `["soumission", id]`, `["nb-soumissions-en-cours", uid]`, `["est-moderateur", uid]`, et tout ce qui commence par `["moderation", …]` (file, comptes, en attente, datasets) : invalider `["moderation"]` après une action.
- Les liens des notifications créées par la base suivent les routes anglaises (`/datasets/…`, `/my-submissions/…`, `/moderation/submissions/…`).

## Votes, favoris, commentaires, notifications
Code : `src/lib/communaute.ts`, `src/lib/commentaires.ts`, `src/lib/notifications.ts`, `src/hooks/use-communaute.ts`, `src/components/communaute/`. Les compteurs de `datasets` (`score`, `nb_votes_pour`, `nb_votes_contre`, `nb_favoris`, `nb_commentaires`) sont recalculés par des triggers : le site ne les écrit jamais.

- **Votes** (`BoutonsVote`, cartes et fiche) : un clic vote, un second clic sur le même bouton retire le vote, l'autre bouton le change. Mise à jour optimiste du cache (catalogue, fiche, favoris) puis retour arrière et message en cas d'erreur. Pas d'upsert PostgREST : la base n'accorde `update` que sur `valeur`, alors que l'upsert réécrit aussi `dataset_id`. On fait donc insert / update / delete (`enregistrerVote()`). Visiteur : redirection vers `/login?next=…`.
- **Tri** : fait dans le navigateur (le catalogue est chargé en entier). `top` = score puis nombre total de votes, `recent` = `mis_a_jour_le`, `name` = titre dans la langue affichée.
- **Favoris** (`BoutonFavori`, page `/favorites`) : insert / delete sur `favoris` ; les membres qui suivent une donnée sont notifiés de ses nouvelles versions par la base.
- **Commentaires** (`SectionCommentaires`, section `#comments` de la fiche, ancre `#comment-<id>` sur chacun) : un niveau de réponses ; un commentaire supprimé (`supprime`, contenu vidé par la base) n'apparaît que s'il a des réponses (« Commentaire supprimé ») ; un commentaire masqué n'est visible que des modérateurs et de son auteur ; modérateurs : `rpc("masquer_commentaire", { commentaire_id, masquer })`. Anti-spam de la base : 10 commentaires en 10 minutes (`erreurs.tropDeCommentaires`).
- **Notifications** (`ClocheNotifications` dans l'en-tête) : 20 dernières et nombre de non lues, rafraîchies à l'ouverture et toutes les 60 secondes ; clic → marquée lue puis ouverture de `lien` (chemins internes seulement) ; « Tout marquer comme lu ». Types : `nouvelle_soumission`, `revue`, `publiee`, `reponse`, `nouvelle_version`.
- **Clés React Query** : `["mes-votes", uid]`, `["mes-favoris", uid]`, `["favoris", uid]`, `["commentaires", datasetId]`, `["notifications", uid]`.
- **Messages éphémères** : `toast` de `sonner` (le `<Toaster />` est dans `App.tsx`).

## Gestion des membres (admin)
Migration `20261023000007_gestion_roles.sql` : fonction `changer_role(utilisateur_id, nouveau_role)` (security definer). Code : `src/lib/admin.ts`, `src/components/admin/RouteAdmin.tsx`, `src/pages/admin/GestionMembres.tsx`.

- La colonne `profils.role` n'est jamais écrite directement : seule `rpc("changer_role")` la change, et la base vérifie tout (réservé à `est_admin()`, rôle d'un admin non modifiable, rôle `admin` jamais donné depuis le site). Nommer ou retirer un administrateur reste manuel (SQL Editor).
- `/admin/users` : liste paginée (25 par page) de `profils`, recherche par pseudo ou nom (caractères spéciaux retirés avant le filtre `or=`), filtre par rôle, confirmation avant chaque changement. `RouteAdmin` s'appuie sur `profil.role` (simple confort d'affichage).
- Clé React Query : `["admin", "membres", …]`.

## Conventions
- Noms de variables, fonctions et composants métier en **français** (`listeDonnees`, `chargerCatalogue`, `FicheDonnee`). Les noms imposés par les bibliothèques restent en anglais.
- Tous les textes visibles passent par i18next (`fr`, `en`, `ar`), jamais en dur.
- Pas de chiffres, partenaires ou logos inventés.
- Petits commits clairs.

## Feuille de route
1. Catalogue en lecture (liste, recherche, filtres).
2. Fiche détail (README, colonnes, aperçu, carte GeoJSON, téléchargements, attribution).
3. Authentification email + Google, page profil.
4. Propositions de données et espace modération (file, revue, statut des datasets).
5. Communauté : votes, tri, favoris, commentaires, notifications.
6. Plus tard : pack de téléchargement (zip + datapackage.json).
