<div align="center">

<img src="public/data_dz_logo_icon.png" alt="" width="96" />

# data-dz

**Les données ouvertes sur l'Algérie, au même endroit.**

Portail open source porté par [New Algeria](https://newalgeria.org) : un catalogue de jeux de données sur l'Algérie,
avec aperçu, globe interactif et téléchargement direct, toujours accompagnés de leur source et de leur licence.

[data-dz.com](https://www.data-dz.com) · [Signaler un problème](https://github.com/new-algeria/data-dz/issues) · [Contribuer](#contribuer)

</div>

---

## Sommaire

- [Ce que fait le site](#ce-que-fait-le-site)
- [Architecture](#architecture)
- [Démarrer en local](#démarrer-en-local)
- [Structure du dépôt](#structure-du-dépôt)
- [Les données](#les-données)
- [Langues et traductions](#langues-et-traductions)
- [Déploiement](#déploiement)
- [Contribuer](#contribuer)
- [Sécurité](#sécurité)
- [Ce qu'il reste à faire](#ce-quil-reste-à-faire)
- [Crédits et licences des données](#crédits-et-licences-des-données)

## Ce que fait le site

Le catalogue affiche ce qui est publié dans la base. Les visiteurs peuvent créer un compte pour avoir un profil public et **proposer des données**, relues par les modérateurs avant leur mise en ligne. Toutes les URL sont en anglais (liste complète dans [`CLAUDE.md`](./CLAUDE.md#routes-url-en-anglais)).

| Page | Contenu |
|---|---|
| **Accueil et catalogue** (`/`) | Globe animé centré sur l'Algérie, chiffres réels lus dans la base (jeux de données, catégories couvertes, total de lignes), recherche plein texte en français, anglais et arabe, filtre par catégorie, tri (les plus appréciés, récemment mis à jour, A → Z), votes et favoris sur chaque carte. Les filtres et le tri sont gardés dans l'URL (`/?q=pharmacies&category=sante&sort=recent`) pour pouvoir partager un lien. |
| **Fiche d'une donnée** (`/datasets/:slug`) | Votes 👍 / 👎, favori ⭐, commentaires avec réponses, bouton de téléchargement du fichier principal, chiffres clés (lignes, colonnes, fichiers, mise à jour), licence et ce qu'elle autorise, globe interactif pour les GeoJSON, liste des fichiers, aperçu des premières lignes, description des colonnes, documentation (README), informations de couverture. |
| **Comptes** (`/login`, `/signup`, `/profile`, `/members/:username`) | Inscription par email, connexion par mot de passe, lien magique ou Google, mot de passe oublié, profil modifiable (pseudo, bio, site web, photo) et page publique de chaque membre. Détails dans [`CLAUDE.md`](./CLAUDE.md#authentification). |
| **Favoris** (`/favorites`) | Les données suivies par le membre ; il est notifié de leurs nouvelles versions. |
| **Notifications** (cloche de l'en-tête) | Réponses aux commentaires, décisions sur ses propositions, publication, nouvelles versions des données suivies, nouvelles propositions (modérateurs). |
| **Propositions** (`/submit`, `/my-submissions`) | Proposer une nouvelle donnée ou la mise à jour d'une donnée existante (titre, description, catégorie, licence, source, mots-clés, wilayas, période, fichiers jusqu'à 50 Mo), puis suivre son statut, répondre aux demandes de modification, renvoyer ou retirer. |
| **Modération** (`/moderation`, réservé aux rôles `moderateur` et `admin`) | File des propositions par statut, revue avec aperçu des fichiers et historique, décision (accepter, demander des modifications, refuser, commenter), changement de statut des datasets (publié, brouillon, archivé). |
| **Gestion des membres** (`/admin/users`, réservé aux administrateurs) | Liste des comptes, recherche, filtre par rôle et changement de rôle (membre, contributeur, modérateur) ; le rôle d'un administrateur n'est pas modifiable depuis le site. |
| **Pages légales** (`/privacy`, `/terms`) | Politique de confidentialité et conditions d'utilisation. |
| **Anciennes URL françaises** (`/donnees/:slug`, `/profil`, `/connexion`…) | Redirigent vers les nouvelles URL anglaises. |

Le site est disponible en **français, anglais et arabe** (l'arabe s'affiche de droite à gauche), en **mode clair et sombre**, et respecte le réglage « réduire les animations » du système.

## Architecture

```
                        ┌──────────────────────────────────────────────┐
                        │ Script de synchronisation (hors de ce dépôt) │
                        │ chaque semaine, depuis GeoAlgeria            │
                        └───────────────┬──────────────────┬───────────┘
                                        │ métadonnées      │ fichiers
                                        ▼                  ▼
┌──────────────────────┐   lecture   ┌──────────────┐   ┌──────────────────────────────┐
│ Navigateur           │ ──────────▶ │   Supabase   │   │ Cloudflare R2                │
│ data-dz (React, SPA) │             │ Postgres+RLS │   │ https://files.data-dz.com    │
│ hébergé sur Vercel   │ ──────────────────────────────▶│ lecture publique             │
└──────────────────────┘   téléchargements, GeoJSON     └──────────────────────────────┘
```

- **Pas de backend maison.** Le navigateur interroge directement Supabase avec la clé *publishable*. Ce qui est visible est décidé par les règles RLS de la base, pas par le site. L'ancien serveur Express (api-dz-backend) et RapidAPI sont abandonnés.
- **Supabase** contient le catalogue : une ligne par donnée dans `datasets`, ses versions, ses fichiers, les catégories, les sources et les licences.
- **Cloudflare R2** contient les fichiers bruts, rangés par format (`json/<nom>.json`, `geojson/<nom>.geojson`…). L'URL d'un fichier est `${VITE_URL_FICHIERS}/${cle_stockage}`.
- **Le site ne fait que lire.** Les données GeoAlgeria sont écrites dans Supabase et R2 par un script de synchronisation externe.

### Stack

| Rôle | Outil |
|---|---|
| Interface | React 18, TypeScript, Vite 5 |
| Style | Tailwind CSS 3, composants [shadcn/ui](https://ui.shadcn.com) (`src/components/ui`), framer-motion pour les animations |
| Données | `@supabase/supabase-js` v2, `@tanstack/react-query` (cache, chargement, erreurs) |
| Navigation | `react-router-dom` v6 |
| Langues | `i18next` et `react-i18next` |
| Globe de l'accueil | `d3-geo` + `world-atlas` (Natural Earth 1:110m), dessiné en Canvas 2D |
| Globe des fiches | `maplibre-gl` v5 en projection globe, fond OpenStreetMap |
| Markdown | `react-markdown` + `remark-gfm` (HTML brut désactivé) |

## Démarrer en local

**Prérequis** : Node.js 18 ou plus récent (testé avec Node 22), npm.

```bash
git clone https://github.com/new-algeria/data-dz.git
cd data-dz
cp .env.example .env.local
npm install
npm run dev
```

Le site s'ouvre sur **http://localhost:5173**. Il lit directement la base de production, en lecture seule.

### Variables d'environnement

Les trois valeurs sont **publiques par nature** et déjà remplies dans `.env.example` :

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publishable (`sb_publishable_…`), faite pour le navigateur et protégée par la RLS |
| `VITE_URL_FICHIERS` | Adresse publique des fichiers sur R2 (`https://files.data-dz.com`) |

Si une variable manque, le site affiche des messages d'erreur au lieu d'une page blanche, et la console indique quoi faire.

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run build` | Site statique dans `dist/` |
| `npm run preview` | Sert le contenu de `dist/` pour le vérifier |
| `npm run lint` | ESLint (doit finir avec 0 erreur) |

## Structure du dépôt

```
src/
├── pages/
│   ├── Catalogue.tsx          Accueil : globe, chiffres, recherche, liste
│   └── FicheDonnee.tsx        Fiche d'une donnée
├── components/
│   ├── accueil/               Globe de l'accueil, compteurs animés
│   ├── catalogue/             Carte d'une donnée, statistiques
│   ├── fiche/                 En-tête, chiffres clés, licence, attribution,
│   │                          globe MapLibre, fichiers, aperçu, colonnes
│   ├── ui/                    Composants shadcn/ui (génériques)
│   └── Navbar, Footer, LanguageSelector, MetaTags…
├── lib/
│   ├── supabase.ts            Client Supabase unique
│   ├── catalogue.ts           Toutes les requêtes (catalogue, catégories, stats, fiche)
│   ├── fichiers.ts            URL R2, formats de taille et de nombres
│   ├── types.ts               Types des tables lues par le site
│   └── traduction.ts, emprise.ts, valeurs.ts
├── hooks/                     Langue, thème, chargement de fichiers avec progression…
├── locales/{fr,en,ar}/        Traductions
└── i18n.ts                    Configuration i18next et sens d'écriture (RTL)
public/                        Icônes, image de partage, manifeste
CLAUDE.md                      Référence technique du projet (tables, conventions)
vercel.json                    Configuration d'hébergement
```

## Les données

Le site lit sept tables Supabase. Le détail des colonnes est dans [`CLAUDE.md`](./CLAUDE.md#tables-supabase-lecture-seule-pour-le-site).

| Table | Ce qu'elle contient |
|---|---|
| `datasets` | Une ligne par donnée : titre et description en `{fr, en, ar}`, README, catégorie, source, licence, mots-clés, statut |
| `versions` | Versions d'une donnée : nombre de lignes, colonnes, aperçu des premières lignes |
| `fichiers` | Fichiers d'une version sur R2 : format, taille, fichier principal |
| `categories`, `sources`, `licences` | Référentiels (noms traduits, source vérifiée, droits accordés par la licence) |
| `profils` | Profil public de chaque compte (pseudo, nom, avatar, bio, site web, rôle) |

Toutes les requêtes sont regroupées dans [`src/lib/catalogue.ts`](./src/lib/catalogue.ts). Un titre ou une description peut manquer dans une langue : le site affiche alors la langue courante, puis le français, puis l'anglais.

## Langues et traductions

Tous les textes visibles passent par i18next, jamais en dur. Pour ajouter un texte :

1. Ajoute la clé dans les **trois** fichiers `src/locales/fr`, `en` et `ar/translation.json`.
2. Utilise-la avec `const { t } = useTranslation()` puis `t("section.cle")`.

L'arabe passe automatiquement en `dir="rtl"`. Côté mise en page, préfère les classes logiques de Tailwind (`ms-`, `me-`, `ps-`, `start-`, `end-`, `text-start`) à `ml-`, `mr-`, `left-`…

## Déploiement

- Hébergement sur **Vercel** (équipe new-algeria, projet data-dz). **Seule la branche `main` part en production** ; chaque pull request a sa preview.
- Les trois variables d'environnement doivent être définies dans Vercel, pour la Production et pour les Preview.
- Dans `vercel.json`, la règle `{ "handle": "filesystem" }` doit rester **avant** la redirection vers `index.html`. Sinon les fichiers de `public/` (icônes, image de partage) renvoient la page HTML.

## Contribuer

Toute aide est bienvenue : code, design, traduction, signalement d'erreurs dans les données.

1. Crée une branche depuis `main` (ex. `fiche/onglet-statistiques`).
2. Respecte les conventions de [`CLAUDE.md`](./CLAUDE.md) :
   - noms de variables, fonctions et composants métier **en français** (`chargerCatalogue`, `FicheDonnee`) ;
   - tous les textes visibles traduits en `fr`, `en` et `ar` ;
   - **aucun chiffre, partenaire ou logo inventé** : tout ce qui est affiché vient de la base ;
   - petits commits clairs.
3. Avant d'ouvrir la PR, vérifie que `npm run build` et `npm run lint` passent sans erreur.
4. Ouvre une pull request vers `main`, avec une description de ce qui change et une capture d'écran si l'interface bouge.

Une erreur dans une donnée GeoAlgeria (adresse, coordonnées…) se signale à la source : [yasserstudio/geoalgeria](https://github.com/yasserstudio/geoalgeria/issues).

## Sécurité

- Le dépôt est **public** : aucun secret ne doit y être commité. Seul `.env.example` est versionné.
- Le site n'utilise que la clé **publishable** de Supabase. La clé `service_role` (ou *secret key*) ne doit **jamais** apparaître dans ce dépôt ni dans le code du site.
- La RLS (*Row Level Security*) est active sur toutes les tables : un visiteur ne voit que les données publiées. Il ne faut jamais chercher à la contourner côté site.
- Les contenus venant des sources (README, propriétés GeoJSON) sont affichés comme du texte : le HTML brut n'est jamais interprété.
- Une faille de sécurité se signale en privé à **admin@newalgeria.org**, pas dans une issue publique.

## Ce qu'il reste à faire

### Feuille de route

- [x] **1. Catalogue en lecture** : liste, recherche plein texte, filtre par catégorie
- [x] **2. Fiche détail** : README, colonnes, aperçu, globe GeoJSON, téléchargements, licence, attribution
- [x] **3. Comptes** : inscription et connexion par email, lien magique et Google (à activer dans Supabase), profil modifiable, avatar, page publique
- [x] **4. Propositions et espace modération** pour les rôles `moderateur` et `admin` : file des propositions, revue, publier / dépublier / archiver un dataset
- [x] **5. Communauté** : votes, tri du catalogue, favoris, commentaires, notifications
- [ ] **6. Pack de téléchargement** : zip de tous les fichiers + `datapackage.json`

### À décider

- [ ] **Choisir une licence pour le code** : il n'y a pas encore de fichier `LICENSE`. Sans licence, le code n'est pas légalement réutilisable, même s'il est public. MIT ou Apache-2.0 sont les choix courants.
- [ ] Fonction serveur pour les invitations dans l'organisation GitHub. Le bouton « Contribuer » est pour l'instant un simple lien, car l'ancienne version exposait un token GitHub dans le navigateur.

### À vérifier en production

- [ ] **CORS sur R2** : `files.data-dz.com` doit autoriser `GET` depuis data-dz.com et les domaines de preview Vercel. Sinon le globe d'une fiche ne peut pas charger le GeoJSON (les téléchargements fonctionnent dans tous les cas).
- [ ] Domaine principal (`www.data-dz.com` ou `data-dz.com`) : il doit correspondre aux URL absolues de `index.html` et `src/components/MetaTags.tsx` (image de partage, `og:url`).

### Améliorations techniques

- [ ] **Tests et CI** : aucun test automatisé ni workflow GitHub Actions pour l'instant. Première étape utile : une action qui lance `npm run lint` et `npm run build` sur chaque PR.
- [ ] **Nettoyer les dépendances** héritées de Lovable et plus utilisées : `apexcharts`, `react-apexcharts`, `ldrs`, `react-country-flag`, `dotted-map`, `react-syntax-highlighter`, `next-navigation`, `react-icons`, `@fortawesome/free-solid-svg-icons`, l'auto-référence `vite_react_shadcn_ts`, ainsi que le plugin `lovable-tagger` dans `vite.config.ts`.
- [ ] **Alléger le premier chargement** : le bundle principal dépasse 1 Mo (Vite affiche un avertissement). Pistes : découper par page avec `React.lazy`, supprimer les composants `ui/` inutilisés.
- [ ] **Types Supabase générés** (`supabase gen types typescript`) à la place des types écrits à la main dans `src/lib/types.ts`.
- [ ] **Versionner le schéma** de la base dans `supabase/migrations/`. Les migrations ont été appliquées à la main dans le SQL Editor et ne sont pas dans ce dépôt.
- [ ] **Pagination côté serveur** (`.range()`) quand le catalogue dépassera quelques centaines de données. Aujourd'hui tout est chargé en une fois.
- [ ] **Aperçus de partage par fiche** : les balises `<meta>` d'une fiche sont posées par JavaScript, donc les robots de partage voient seulement celles de l'accueil. Il faudrait un pré-rendu, ou une fonction Vercel qui sert les bonnes balises.
- [ ] Filtre par **wilaya** (la colonne `datasets.wilayas` existe déjà) et compteurs de vues et de téléchargements (`nb_vues`, `nb_telechargements`).

## Crédits et licences des données

- Chaque jeu de données garde **la licence de sa source**, affichée sur sa fiche.
- Les données géographiques viennent de [**GeoAlgeria**](https://geoalgeria.com) par Yasser's studio, synchronisées chaque semaine.
- Une partie provient d'[**OpenStreetMap**](https://www.openstreetmap.org/copyright), sous licence ODbL : la citation est obligatoire en cas de réutilisation.
- Le fond du globe de l'accueil vient de [Natural Earth](https://www.naturalearthdata.com) (domaine public), via [world-atlas](https://github.com/topojson/world-atlas). Le fond des globes des fiches vient d'OpenStreetMap.

---

<div align="center">

Un projet de [New Algeria](https://newalgeria.org) · [GitHub](https://github.com/new-algeria) · [X](https://x.com/newalgeria_org) · [admin@newalgeria.org](mailto:admin@newalgeria.org)

</div>
