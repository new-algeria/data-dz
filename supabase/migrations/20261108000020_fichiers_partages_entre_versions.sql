-- =====================================================================
-- data-dz · Un même fichier stocké peut appartenir à plusieurs versions
-- À coller dans Supabase → SQL Editor → New query → Run (après 20261107000019). Se relance sans risque.
--
-- Pourquoi : quand OpenStreetMap ajoute son fichier à une donnée GeoAlgeria (ou quand GeoAlgeria publie
-- une version d'une donnée qui a déjà un fichier OpenStreetMap), le trigger `conserver_fichiers_autres_sources`
-- (migration 20261102000017) recopie les fichiers de l'autre source dans la nouvelle version, avec la même
-- `cle_stockage` (même objet R2, rien n'est dupliqué). Une contrainte d'unicité sur `cle_stockage` seule refuse
-- cette recopie : 409 sur les 13 compléments OpenStreetMap du 2026-11-08.
--
-- 1. L'unicité porte désormais sur (version_id, cle_stockage).
-- 2. Les versions avortées le 2026-11-08 (jamais devenues courantes) sont retirées : sinon leur numéro
--    bloquerait le passage suivant.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Unicité de cle_stockage par version, et non plus globale
-- ---------------------------------------------------------------------
do $$
declare
  contrainte record;
  index_seul record;
begin
  -- Contraintes UNIQUE portant exactement sur (cle_stockage)
  for contrainte in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.fichiers'::regclass
      and c.contype = 'u'
      and c.conkey = array[(select attnum from pg_attribute where attrelid = 'public.fichiers'::regclass and attname = 'cle_stockage')]::smallint[]
  loop
    execute format('alter table public.fichiers drop constraint %I', contrainte.conname);
    raise notice 'Contrainte retirée : %', contrainte.conname;
  end loop;

  -- Index UNIQUE (hors contrainte) portant exactement sur (cle_stockage)
  for index_seul in
    select i.indexrelid::regclass::text as nom
    from pg_index i
    where i.indrelid = 'public.fichiers'::regclass
      and i.indisunique
      and not i.indisprimary
      and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)
      and i.indnatts = 1
      and i.indkey[0] = (select attnum from pg_attribute where attrelid = 'public.fichiers'::regclass and attname = 'cle_stockage')
  loop
    execute format('drop index %s', index_seul.nom);
    raise notice 'Index retiré : %', index_seul.nom;
  end loop;
end;
$$;

create unique index if not exists fichiers_version_cle_stockage_key on public.fichiers (version_id, cle_stockage);
create index if not exists fichiers_cle_stockage_idx on public.fichiers (cle_stockage);

-- ---------------------------------------------------------------------
-- 2. Versions avortées des compléments OpenStreetMap (numéro x.y.AAAAMMJJ, jamais courantes)
-- ---------------------------------------------------------------------
drop table if exists pg_temp.versions_avortees;
create temporary table versions_avortees as
select v.id
from public.versions v
where v.numero ~ '^\d+\.\d+\.20\d{6}$'
  and v.publie_le >= '2026-11-08'
  and not exists (select 1 from public.datasets d where d.version_courante_id = v.id)
  and not exists (
    select 1 from public.fichiers f
    where f.version_id = v.id
      and f.source_id is distinct from (select s.id from public.sources s where s.slug = 'openstreetmap')
  );

delete from public.fichiers f using versions_avortees a where f.version_id = a.id;
delete from public.versions v using versions_avortees a where v.id = a.id;
drop table if exists pg_temp.versions_avortees;
