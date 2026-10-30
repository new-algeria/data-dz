# data-dz v2

Portail open source de données sur l'Algérie, porté par New Algeria (newalgeria.org).
Ce dépôt est **public** : aucun secret ne doit jamais y être commité.

Commandes : `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm test`.
Variables d'environnement : voir `.env.example` (copier en `.env.local`).

# Référence du projet

## Architecture
```
Navigateur (data-dz, site statique React)
  ├── API data-dz (https://api.data-dz.com, dépôt data-dz-api) → catalogue, fiches, statistiques,
  │      téléchargements et conversions, gestion des données (admin)
  ├── Supabase (Auth + API REST)                 → comptes, profils, votes, favoris, commentaires,
  │                                                 propositions, modération (RLS)
  └── R2 public (https://files.data-dz.com/web-assets/) → illustrations uniquement
```
- **Catalogue et fichiers passent par l'API** (`src/lib/api.ts`, `appelerApi()`, `VITE_URL_API`) : le site ne lit plus les tables du catalogue ni R2 en direct. La clé de stockage R2 n'est jamais exposée ; chaque `Fichier` porte `url` (lecture : carte, aperçu) et `url_telechargement` (`/v1/datasets/<slug>/download?format=&file=`, redirection vers un lien signé de 10 min).
- Le cache CDN de l'API dure 15 s pour le catalogue et les fiches : après un vote, la mise à jour optimiste du cache React Query reste la référence.
- R2 range les fichiers synchronisés par format (`json/<nom>.json`, `geojson/<nom>.geojson`) et ceux envoyés par l'API dans `datasets/<slug>/<horodatage>/`. Les conversions sont dans `exports/`. Seul `web-assets/` reste public.
- Les données GeoAlgeria sont synchronisées chaque semaine par un script externe qui passe par l'API (`/v1/admin/*` avec `CLE_SYNCHRO`, voir le README de data-dz-api).
- Hébergement : Vercel (équipe new-algeria, projet data-dz). Seule la branche `main` part en production.

## Tables Supabase (lues par l'API pour le catalogue, par le site pour la communauté)
| Table | Contenu |
|---|---|
| `profils` | 1 ligne par compte (`id` = `auth.users.id`) : `pseudo`, `nom_affiche`, `avatar_url`, `bio`, `site_web`, `role` (`membre`, `contributeur`, `moderateur`, `admin`), `reputation` |
| `categories` | `slug`, `nom` (jsonb `{fr,en,ar}`), `icone`, `ordre` |
| `licences` | `code` (ex. `ODbL-1.0`), `nom`, `url`, `usage_commercial`, `attribution_requise`, `partage_identique` |
| `sources` | `slug`, `nom`, `url`, `type`, `verifiee` |
| `datasets` | `slug`, `titre` et `description` (jsonb `{fr,en,ar}`, pas toujours complets), `readme` (Markdown), `categorie_slug`, `source_id`, `licence_code`, `licence_details`, `url_source`, `mots_cles[]`, `wilayas[]`, `statut` (`publie`…), `version_courante_id`, `infos_source` (jsonb), `illustration_url`, `recherche` (tsvector) |
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
| `/members/:username` | Page publique d'un membre (sa propre page redirige vers `/profile`) | public |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | Authentification (voir ci-dessous) | public |
| `/profile` | Mon profil : ce que voient les autres (en-tête public) + modification, sur une seule page | connecté |
| `/favorites` | Mes favoris (données suivies) | connecté |
| `/submit` | Proposer une donnée | connecté |
| `/my-submissions`, `/my-submissions/:id` | Mes propositions, détail | connecté |
| `/moderation` (`?status=`) | File des propositions | modérateur / admin |
| `/moderation/submissions/:id` | Revue d'une proposition | modérateur / admin |
| `/moderation/datasets` | Statut des datasets (publié / brouillon / archivé) | modérateur / admin |
| `/admin/users` | Gestion des membres et de leurs rôles | admin |
| `/admin/datasets` | Gestion des données (créer, modifier, masquer, supprimer, illustration, fichiers) | admin |
| `/api` | Page de l'API publique (thème violet) : adresse, exemples, routes, liste de toutes les données avec leur URL API | public |
| `/privacy`, `/terms` | Pages légales | public |

- **Anciennes URL françaises** (`/donnees/:slug`, `/dataset/:slug`, `/membres/:pseudo`, `/profil`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe`, `/auth/retour`, `/confidentialite`, `/conditions`) : redirection vers la nouvelle URL en gardant `?…` et `#…` (indispensable pour les liens d'email déjà envoyés).
- **Page d'origine** : paramètre `?next=` (l'ancien `?suite=` est encore lu).
- **Aperçu sur les réseaux sociaux** : leurs robots ne lancent pas le JavaScript. `vercel.json` envoie `/datasets/:slug` à `https://api.data-dz.com/v1/datasets/<slug>/share` quand l'en-tête `user-agent` est celui d'un robot connu (WhatsApp, Facebook, X, LinkedIn, Slack, Discord, Telegram…, liste dans la règle ; jamais Googlebot, qui lit le site normalement). Cette page porte les balises Open Graph de la fiche et l'image `preview.png` générée par l'API (logo, drapeau, catégorie, titre, source, chiffres, illustration ; langue `?lng=`, anglais par défaut). La fiche pointe aussi vers cette image (`urlApercu()` dans `src/lib/api.ts`, prop `image` de `CustomMetaTags`).
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
| `/profile` | Protégée (`RouteProtegee`) : en haut l'en-tête public (`EnTeteMembre`, même composant que la page publique, bouton « Copier le lien de mon profil »), puis avatar, pseudo, nom affiché, bio, site web, compte. Il n'y a plus de lien « Ma page publique » |
| `/members/:username` | Page publique d'un membre (`EnTeteMembre` + `CarteBio`, `src/components/membres/FicheMembre.tsx`) ; 404 propre si le pseudo n'existe pas ; redirige vers `/profile` si c'est le membre connecté |

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

- **Statuts** (`soumissions.statut`) : `en_attente` → `modifications_demandees` ⇄ `en_attente` (`rpc("renvoyer_soumission")`) ; `acceptee` / `refusee` (`rpc("decider_soumission", { soumission_id, decision, commentaire })`, commentaire obligatoire pour refuser ou demander des modifications) ; `retiree` (`rpc("retirer_soumission")`) ; `publiee` uniquement par l'API (`marquer_soumission_publiee`, service_role). Une proposition `acceptee` s'affiche « En attente de mise en ligne ».
- **Source d'une proposition** (`ChoixSourceProposition`) : menu des sources connues (`GET /v1/sources`, sauf `communaute`), « Je ne sais pas » et « Autre source… » (champ texte). La base ne garde que `source_nom` / `source_url` : choisir une source connue écrit son nom exact (et son site dans l'adresse si elle est vide), ce que la mise en ligne reconnaît ensuite. Un nom qui ne correspond à aucune source s'affiche en « Autre source ».
- **Modification** par l'auteur (contenu et fichiers) tant que le statut est `en_attente` ou `modifications_demandees`. **5 propositions en cours** au maximum : vérifié avant l'envoi avec `rpc("nb_soumissions_en_cours")` (la RLS refuse aussi).
- **Mise à jour d'une donnée** : impossible pour les sources synchronisées (`sources.type = 'synchronisee'`, GeoAlgeria) ; le site propose à la place de signaler l'erreur à GeoAlgeria.
- **Envoi** : ligne `soumissions` d'abord, puis chaque fichier dans le bucket privé **`soumissions`** au chemin **`<uid>/<id proposition>/<nom-nettoyé>`** (contenu brut + `contentType` explicite : avec un `File`, supabase-js ignore `contentType`), puis la ligne `soumission_fichiers` (le fichier est supprimé si elle échoue). Formats : csv, json, geojson (`application/geo+json`), xlsx, xml, zip, pdf ; 50 Mo maximum, vérifiés avant l'envoi.
- **Modération** : `rpc("est_moderateur")` (hook `useEstModerateur`) décide de l'affichage de `RouteModerateur` et du lien « Modération » de l'en-tête (avec le nombre en attente) ; la RLS et les fonctions de la base restent seules juges. Fichiers lus par URL signée (10 minutes) ; aperçu des 20 premières lignes pour CSV (lecture partielle) et JSON / GeoJSON (10 Mo maximum). Un modérateur ne décide pas de sa propre proposition (un admin le peut).
- **Clés React Query** : `["mes-soumissions", uid]`, `["soumission", id]`, `["nb-soumissions-en-cours", uid]`, `["est-moderateur", uid]`, et tout ce qui commence par `["moderation", …]` (file, comptes, en attente, datasets) : invalider `["moderation"]` après une action.
- **Mise en ligne** (admin) : sur la page de revue d'une proposition `acceptee`, le bouton « Mettre en ligne » (`mettreEnLigneProposition()` dans `src/lib/admin-donnees.ts`) appelle `POST /v1/admin/submissions/:id/publish`. L'API crée la donnée avec la source choisie au-dessus du bouton (`ChoixSource` : présélectionnée si le nom ou le site tapé par l'auteur correspond à une source existante, `sourceCorrespondante()` dans `src/lib/sources.ts` ; sinon `communaute`, et « Nouvelle source » est prérempli avec ce que l'auteur a tapé) ou une nouvelle version de la donnée visée, copie les fichiers CSV / JSON / GeoJSON (Excel converti en CSV ; PDF, ZIP, XML ignorés et signalés), publie, puis passe la proposition en `publiee` (l'auteur est notifié). Un modérateur voit seulement « En attente de mise en ligne ».
- Les liens des notifications créées par la base suivent les routes anglaises (`/datasets/…`, `/my-submissions/…`, `/moderation/submissions/…`).
- **Revue enrichie** (migration `20261024000008_revue_moderateurs.sql`) : tant qu'une proposition est `en_attente` ou `modifications_demandees`, un modérateur peut compléter ou corriger son contenu (mêmes colonnes que l'auteur, `ContenuProposition` avec `moderation`) et ajouter ou supprimer des fichiers, toujours rangés dans le dossier de l'auteur (`<uid auteur>/<id proposition>/…`, `GestionFichiers` avec `idAuteur`). Chaque changement est tracé par `rpc("noter_modification", { soumission_id, details })` : revue `modification` (le statut ne change pas) et notification à l'auteur. La page de revue liste les champs facultatifs vides (`champsVides()`). Sa propre proposition se modifie depuis « Mes propositions ».

## Emails de notification
Fonction Edge `supabase/functions/envoyer-email/` (Deno, Resend). Le trigger `envoyer_email_notification` (migration `20261024000008`) appelle la fonction avec `pg_net` pour chaque notification `nouvelle_soumission` (modérateurs et admins), `revue` et `publiee` (auteur). La fonction relit la notification avec la clé service_role (fournie par Supabase, jamais dans ce dépôt), cherche l'email du compte et envoie un message en anglais (HTML aux couleurs du site, en tableaux pour les clients mail, et version texte).

- **Configuration** (voir `supabase/functions/envoyer-email/README.md`) : secrets Vault `emails_url` et `emails_secret`, secrets de la fonction `EMAILS_SECRET`, `RESEND_API_KEY`, `EMAIL_EXPEDITEUR`, `URL_SITE`. Sans les secrets Vault, aucun email n'est envoyé et rien ne casse.
- Contenu des emails : `contenu.ts` (titres et commentaires échappés, liens internes seulement, testé par `contenu.test.ts`). Toute nouvelle notification envoyée par email doit y avoir son texte. **Redéployer la fonction après chaque changement** (`npx supabase functions deploy envoyer-email --no-verify-jwt`) : fusionner ne suffit pas.

## Votes, favoris, commentaires, notifications
Code : `src/lib/communaute.ts`, `src/lib/commentaires.ts`, `src/lib/notifications.ts`, `src/hooks/use-communaute.ts`, `src/components/communaute/`. Les compteurs de `datasets` (`score`, `nb_votes_pour`, `nb_votes_contre`, `nb_favoris`, `nb_commentaires`) sont recalculés par des triggers : le site ne les écrit jamais.

- **Votes** (`BoutonsVote`, cartes et fiche) : un clic vote, un second clic sur le même bouton retire le vote, l'autre bouton le change. Mise à jour optimiste du cache (catalogue, fiche, favoris) puis retour arrière et message en cas d'erreur. Pas d'upsert PostgREST : la base n'accorde `update` que sur `valeur`, alors que l'upsert réécrit aussi `dataset_id`. On fait donc insert / update / delete (`enregistrerVote()`). Visiteur : redirection vers `/login?next=…`.
- **Tri** : fait dans le navigateur (le catalogue est chargé en entier). `top` = score puis nombre total de votes, `recent` = `mis_a_jour_le`, `name` = titre dans la langue affichée.
- **Données récentes** (`src/lib/recents.ts`) : ajoutée depuis moins de 4 jours (`JOURS_RECENTS`, date `publie_le`, sinon `cree_le`, renvoyées par l'API) → badge « Récent » sur `CarteDonnee` et place en tête du catalogue quels que soient le tri et les filtres (`recentsEnPremier()`, la plus récente d'abord).
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

## Gestion des données (admin)
Code : `src/lib/admin-donnees.ts`, `src/pages/admin/GestionDonnees.tsx`, `src/components/admin/DialogueDonnee.tsx`. Tout passe par l'API (`/v1/admin`, session Supabase jointe) : le site n'écrit jamais dans `datasets` directement.

- `/admin/datasets` : recherche, filtre par statut, création, modification, masquer / publier (`statut` `archive` ⇄ `publie`), suppression définitive (confirmation en tapant le slug ; l'API répond 409 si la base refuse, il faut alors archiver).
- **Dialogue** : titre et description en fr / en / ar (titre fr obligatoire), slug tiré du titre (modifiable ensuite, voir « Identifiant » ci-dessous), catégorie, source, licence, page de la source, mots-clés, statut. **Illustration** recadrée en 1200 × 720 et convertie en WebP dans le navigateur (`preparerIllustration()`), envoyée à l'API (2 Mo maximum). **Fichiers** (JSON, GeoJSON, CSV, 100 Mo) : URL d'envoi signée puis `PUT` direct vers R2, puis l'API publie la version (lignes, colonnes et aperçu calculés).
- **Identifiant** (slug) : modifiable dans le dialogue, sauf pour une donnée synchronisée (la synchro GeoAlgeria retrouve ses données par leur slug). Disponibilité vérifiée pendant la saisie (`GET /v1/admin/slugs/:slug`, aussi refusé s'il est l'ancien identifiant d'une autre donnée), puis `renommerDonnee()` → `POST /v1/admin/datasets/:slug/rename` avant les autres modifications. L'ancien identifiant est gardé dans `datasets.anciens_slugs` (migration `20261029000010_anciens_slugs.sql`, **à appliquer avant de déployer l'API**) : `/v1/datasets/<ancien>/…` redirige (307), `FicheDonnee` passe alors à la nouvelle URL, et les liens des notifications sont réécrits. L'image par défaut dépendant du slug (`aUneImageDuPack()`), celle qui était affichée est enregistrée comme `illustration_url`.
- **Sources** (`ChoixSource`, `src/components/admin/ChoixSource.tsx`) : menu des sources lu sans cache par `GET /v1/admin/sources` (hook `useSourcesAdmin`, clé `["admin", "sources"]` ; le public `/v1/sources` est en cache CDN 1 h), avec « Nouvelle source » (nom + site, `POST /v1/admin/sources`, type repris de la source `communaute`). Un nom déjà pris (casse et accents ignorés) répond 409 `source_exists` : la source existante est sélectionnée. Le bandeau « Données issues de » de l'accueil reste une liste fixe (`BandeauSources.tsx`), sans lien avec la table.
- Donnée synchronisée (`sources.type = 'synchronisee'`) : avertissement, ses métadonnées seront réécrites par la synchro ; statut et illustration sont conservés.
- Migration `20261025000009_illustrations.sql` : colonne `datasets.illustration_url` (écrite par l'API uniquement). Tant qu'elle n'est pas appliquée, l'API lit le catalogue et l'admin sans illustration, et l'envoi d'une illustration répond 503 `schema_outdated`.
- **Migrations** : elles sont appliquées à la main dans le SQL Editor de Supabase. Toute nouvelle migration doit être appliquée en production **avant** de déployer le code qui s'en sert (sinon : erreur 42703 « colonne inconnue », vue côté navigateur comme un 502 de l'API).
- Clés React Query : `["admin", "donnees", …]` ; après une action, invalider aussi `catalogue`, `fiche`, `statistiques`, `moderation`.

## Fiche d'une donnée : fichiers et carte
- **Télécharger** (`DialogueTelechargement`, bouton principal de l'en-tête) : choix du fichier (s'il y en a plusieurs) et du format CSV / Excel / JSON / GeoJSON (`donnee.ressources`, fournies par l'API). Le lien est d'abord vérifié (`fetch` avec `redirect: "manual"`) : une conversion impossible (422 : pas de tableau, pas de coordonnées) s'affiche dans le dialogue au lieu d'un JSON brut.
- **Bouton API** (`BoutonApi`, violet, sous le téléchargement) : affiche `https://api.data-dz.com/v1/datasets/<slug>` et le copie au clic.
- **Fichiers** (`ListeFichiers`) : un même fichier publié en plusieurs formats (même nom, ex. `5g-mobilis.geojson` et `5g-mobilis.json`) forme une seule ligne avec un bouton de téléchargement par format (`grouperFichiers()` dans `src/lib/fichiers.ts`).
- **Carte** (`GlobeDonnees`) : affiche tous les fichiers GeoJSON de la version. S'il y en a plusieurs, un menu permet de choisir le fichier affiché (le principal par défaut) ou de **tout superposer** (6 fichiers maximum, une couleur et une légende par fichier). Les fichiers déjà téléchargés restent en mémoire pendant la visite ; au-delà de 10 Mo, l'affichage attend un clic. Cadrage initial sur l'Algérie, molette activée seulement après un clic (désactivée quand la souris sort), points regroupés au-delà de 2 000, popup limitée aux 3 premiers champs texte lisibles (`champsLisibles()` dans `src/lib/carte.ts`, jamais d'identifiant technique). Elle n'a plus sa propre section que si tous les GeoJSON dépassent 5 Mo (sinon elle est dans le visuel).
- **Couverture** (`InfosSource`) : seules les clés connues de `infos_source` sont affichées (`CLES_AFFICHEES` dans `src/lib/couverture.ts`), avec un libellé traduit (`fiche.couvertureCles.*`) ; les autres (`bbox`…) sont masquées.
- **Bouton Télécharger** : le sous-titre liste les formats réellement proposés par l'API (`telechargements` des ressources), pas une liste fixe.

## Visuel automatique de la fiche
Chaque fiche commence, juste sous l'en-tête, par un visuel détecté à partir de ses fichiers, sans rien en base. Code : `src/lib/detecterVisuel.ts` (fonctions pures, testées dans `detecterVisuel.test.ts`), `src/hooks/use-visuel.ts`, `src/components/fiche/visuel/` (`VisuelDonnee`, `CarteDepuisLignes`, `GraphiqueVisuel`), `src/lib/cacheVisuel.ts`.

- **Fichiers** : GeoJSON principal (sinon le premier) pour la carte, JSON principal (sinon le plus léger) pour le graphique ; jamais plus de 5 Mo (`TAILLE_MAX_VISUEL`).
- **Priorité** : 1. GeoJSON, ou JSON avec `lat`/`latitude` + `lon`/`lng`/`longitude` → carte à points ; code de wilaya (`code_wilaya`, `wilaya_code`…) + colonne numérique → carte des wilayas colorée (contours `wilaya-boundaries` du jeu `divisions-administratives`, noms de `chargerWilayas()`, sélecteurs d'année et de mesure). 2. Sinon colonne de temps (`annee`, `year`, `date`, `mois`…) + nombre → courbe ; catégorie + nombre sans temps → barres (top 15). 3. Sinon rien (aucun cadre). Carte et graphique possibles : carte par défaut et sélecteur « Carte | Graphique ».
- **Courbe** : format long (catégories ≤ 50 valeurs, 69 pour les wilayas, + `valeur`) → sélecteur de série, la première par ordre alphabétique par défaut ; format large → une série par colonne numérique, 3 cochées. Colonne `type` contenant « projection » → partie projetée en pointillés et légende « Projection ». Unité : colonne `unite`, sinon déduite du nom (`nb_jours` → « jours »). Titre automatique « Série, début-fin ». Export PNG (`telechargerGraphiquePng()`, styles recopiés car les couleurs sont des variables CSS).
- Jamais tracés : identifiants, codes, latitude, longitude (`MOTIF_EXCLU`).
- **Affichage** : hauteur fixe (`HAUTEUR_VISUEL` : 260 px, 380 px à partir de `md`) avec squelette, mention « Source : … », carte en projection plane (le bouton globe reste), axes inversés en arabe. MapLibre et Recharts sont chargés à la demande (`lazy`).
- **Cache** : la détection est gardée en mémoire et dans `localStorage` (`data-dz:visuels:v1`, clé = slug + fichiers retenus et leur taille). À la visite suivante, une carte issue d'un GeoJSON s'affiche sans retélécharger le JSON.

## Page API (`/api`)
Code : `src/pages/PageApi.tsx`. Couleur de l'API sur tout le site : **violet** (comme `BoutonApi` sur la fiche).
- En-tête : « data-dz / API » (le « / API » violet n'apparaît à droite du logo que sur cette page) ; ailleurs, lien « API » dans l'en-tête (grand écran), dans « Explorer » du menu mobile et dans le pied de page.
- Contenu : adresse de base `${URL_API}/v1` à copier, liens vers la documentation interactive (`/docs`) et la spécification (`/openapi.json`), trois points clés (sans clé, formats, limites 120 / 30 appels par minute), exemple curl / JavaScript / Python avec une vraie donnée, routes principales, puis **toutes les données** (même requête que le catalogue, clé `["catalogue", "", null]`), filtrables, avec leur URL API à copier, « Voir le JSON » (`/data?limit=100`) et le lien vers la fiche.
- Le code des exemples passe à la ligne (`whitespace-pre-wrap`) et les colonnes de grille ont `min-w-0` : sinon une longue URL élargit la page sur mobile.

## Interface
- **En-tête** (`Navbar.tsx`) : « Proposer une donnée » mis en avant pour tous (GitHub n'est plus dans l'en-tête, seulement dans le pied de page). En dessous de `md`, cloche + menu hamburger (`MenuMobile.tsx`, panneau `Sheet` pleine largeur sur téléphone, à droite, à gauche en arabe) qui regroupe navigation, compte, modération, langue et thème. Visiteur : un seul bouton « Se connecter » (l'inscription est proposée sur la page de connexion), jamais deux. Langue et thème sont deux sélecteurs segmentés (« Clair | Sombre ») épinglés en bas du panneau ; « Se déconnecter » est dans « Mon espace ».
- **Hero de l'accueil** : toujours la hauteur de l'écran (`min-h-[100svh]`), le catalogue n'apparaît qu'au défilement ; sur les écrans peu hauts (`max-height: 820px`), titre et espacements se resserrent pour que tout tienne. Colonne gauche : badge, titre, recherche (`RechercheHero` : remplit la recherche du catalogue puis y fait défiler ; exemples traduits choisis parce qu'ils renvoient des résultats dans les trois langues), bouton « Explorer », chiffres ; à droite le globe, jamais plus haut que l'écran. « Proposer une donnée » n'est pas dans le hero : seulement dans l'en-tête et le menu mobile. La grille du hero est en `grid-cols-1` sur mobile (sinon un titre long élargit la colonne au-delà de l'écran).
- **Champs de recherche** : texte en 16 px minimum (sinon iOS zoome la page au toucher). Placeholder du hero très court (il doit tenir sur un iPhone SE dans les trois langues) ; sur mobile, le bouton « Chercher » se réduit à sa flèche.
- **Statistiques du hero** : jeux de données, catégories, lignes et membres inscrits (nombre de lignes de `profils`, lu sans télécharger les lignes), sur une ligne de 4 tuiles (2 × 2 sur mobile). Rien n'est écrit en dur. **Masquées pour l'instant** (bloc commenté dans `Catalogue.tsx`) ; le bouton « Explorer les X jeux de données » garde son compteur.
- **Bandeau des sources** (`BandeauSources`, sous le bouton « Explorer ») : « Données issues de » puis les sources qui défilent (deux copies identiques, la seconde `aria-hidden` et hors tabulation), lien vers le site officiel en nouvel onglet, gris puis vert au survol, pause au survol. Sens inversé en arabe (`animate-marquee-rtl`). Avec `prefers-reduced-motion` : grille centrée, sans copie ni animation. Prop `logo` (chemin `public/sources/<nom>.svg`) prévue pour remplacer l'icône lucide. Noms traduits dans `accueil.sources.noms`.
- **Placeholder de la recherche du hero** : court sur mobile (`placeholder`), complet à partir de 640 px (`placeholderLong`) ; les deux doivent tenir dans le champ (vérifier à 1024 px, le champ y est le plus étroit).
- **Filtres du catalogue sur mobile** : recherche sur toute la largeur, catégorie et tri côte à côte en dessous.
- **Plugin Flowbite** : il impose bordure, fond et marges à tous les `input` ; un champ au style propre a besoin des modificateurs `!` (voir `RechercheHero`).
- **Après un déploiement** : un onglet ouvert avant demande d'anciens fichiers `assets/` qui n'existent plus (Vercel répond `index.html` : « Failed to fetch dynamically imported module »). Toutes les pages et composants chargés à la demande passent par `lazyAvecRechargement()` (`src/lib/rechargement.ts`, jamais `lazy()` directement) : la page se recharge une fois (garde-fou de 10 s dans `sessionStorage`, pas de boucle). `LimiteErreur` (dans `App.tsx`) affiche « Cette page n'a pas pu s'afficher » avec un bouton « Recharger » au lieu d'une page blanche.
- **Thème** : mémorisé dans `localStorage` (`theme`), sinon réglage du système.
- **Premier affichage** : un petit script dans `index.html` applique le thème (classe `dark`) et la langue (`lang`, `dir`) avant le chargement de React, avec les mêmes règles que `use-theme.tsx` et i18next (`?lng=`, choix mémorisé `i18nextLng`, langue de l'appareil, sinon `fr`) : pas de « flash ». Toute évolution de ces règles doit être faite aux deux endroits.
- **Illustrations** (`src/lib/illustrations.ts`, `urlIllustration(donnee, taille)`) : `illustration_url` choisie par un admin, sinon l'image du pack en WebP sur R2 dans `web-assets/webp/` (`<nom>.webp` 1200 × 720 pour l'en-tête de fiche, `<nom>-600.webp` pour le coin haut de `CarteDonnee`), sinon la carte de l'Algérie. Atténuée (opacité 40 % en clair, 25 % en sombre, plus forte au survol des cartes) et fondue par un masque en dégradé (sens inversé en arabe), luminosité +10 %. En-tête de fiche : image petite et centrée (environ 1/4 de la largeur, 1/2 sur mobile), jamais en plein fond. Image absente : masquée sans casser la mise en page.
- **Drapeau** : `DrapeauAlgerie` (SVG aux proportions officielles, jamais l'emoji 🇩🇿 qui s'affiche « DZ » sous Windows), dans le badge du hero et le pied de page.
- **Couleurs** : les couleurs shadcn (`popover`, `card`, `muted`, `accent`, `destructive`, `input`, `ring`) sont déclarées dans `tailwind.config.ts` à partir des variables CSS de `src/index.css` (clair et sombre). Ne jamais coder une couleur en dur à leur place : menus et listes déroulantes deviendraient transparents ou illisibles en mode sombre.

## Tests
Vitest est installé (`npm test`) ; premiers tests : `src/lib/detecterVisuel.test.ts` (détection du visuel sur des échantillons aux formats FMI, Banque mondiale, canicules, FMI large, pharmacies) et `src/lib/carte.test.ts`. À compléter, par ordre de priorité :
1. **Tests unitaires** (Vitest) des fonctions pures de `src/lib/` : `trierDonnees`, `grouperFichiers`, `suiteSure`, `cleErreur`, `texteTraduit`, `urlIllustration`, routes.
2. **Tests de composants** (Testing Library) : catalogue (recherche, filtres, tri), fiche, dialogue de téléchargement, formulaires d'authentification et de proposition.
3. **Tests de bout en bout** (Playwright) sur les parcours clés, en fr / en / ar et sur mobile : accueil → fiche → téléchargement, connexion, proposition, modération, `/admin/datasets`. Ils auraient détecté la colonne `illustration_url` absente en production.
4. **Contrôle du schéma** : vérifier en CI que chaque migration de `supabase/migrations/` est appliquée sur la base cible (colonnes, fonctions `rpc`), à défaut d'un déploiement automatique des migrations.
Toute nouvelle logique de `src/lib/` devrait arriver avec ses tests dès que Vitest est installé.

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
