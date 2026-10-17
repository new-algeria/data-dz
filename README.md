# data-dz

Portail open source de données sur l'Algérie, porté par [New Algeria](https://newalgeria.org).
Les visiteurs parcourent un catalogue, prévisualisent et téléchargent les jeux de données, avec leur source et leur licence.

## Architecture

```
Navigateur (data-dz, site statique React)
  ├── Supabase (Postgres + Auth + API REST)     → catalogue, comptes, profils
  └── Cloudflare R2 (https://files.data-dz.com) → fichiers bruts, lecture publique
```

Stack : React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@tanstack/react-query`, i18next (français, anglais, arabe en RTL), Leaflet.

## Démarrer

```bash
cp .env.example .env.local   # trois valeurs publiques, aucune clé secrète
npm install
npm run dev
```

`npm run build` produit le site statique dans `dist/`, `npm run lint` vérifie le code.

## Contribuer

Les conventions du projet (noms en français, textes via i18next, pas de chiffres inventés, sécurité) sont décrites dans [`CLAUDE.md`](./CLAUDE.md).
Seule la clé publishable Supabase va dans le site : ne jamais commiter de clé `service_role`.
