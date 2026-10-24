-- Illustration d'une donnée, choisie par un administrateur depuis /admin/datasets.
-- Écrite uniquement par l'API (clé secrète, après vérification du rôle admin) : image rangée sur R2
-- dans web-assets/datasets/ et servie par https://files.data-dz.com. Sans valeur, le site affiche
-- l'image par défaut du slug (src/lib/illustrations.ts).

alter table public.datasets
  add column if not exists illustration_url text
  constraint datasets_illustration_url_https check (illustration_url is null or illustration_url ~ '^https://');

comment on column public.datasets.illustration_url is
  'URL https de l''illustration (R2 web-assets/datasets/). Null : image par défaut du slug.';
