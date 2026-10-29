-- Anciens identifiants (slugs) d'une donnée renommée depuis /admin/datasets.
-- Écrits uniquement par l'API (POST /v1/admin/datasets/:slug/rename, clé secrète après vérification du rôle admin).
-- La fiche et les routes /v1/datasets/<ancien>/… redirigent (307) vers l'identifiant actuel : les liens déjà
-- partagés, les emails et les appels à l'API continuent de marcher. Un ancien identifiant ne peut pas être
-- repris par une autre donnée (vérifié par l'API).

alter table public.datasets
  add column if not exists anciens_slugs text[] not null default '{}';

create index if not exists datasets_anciens_slugs_idx on public.datasets using gin (anciens_slugs);

comment on column public.datasets.anciens_slugs is
  'Anciens identifiants de la donnée (renommages) : ils redirigent vers le slug actuel.';
