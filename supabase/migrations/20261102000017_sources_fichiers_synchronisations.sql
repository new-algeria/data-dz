-- =====================================================================
-- data-dz · Fichiers par source (GeoAlgeria, OpenStreetMap…) et synchronisations
-- À coller dans Supabase → SQL Editor → New query → Run, APRÈS 20261102000016 et AVANT de déployer l'API et le site.
--
-- 1. Chaque fichier d'une version peut venir d'une autre source que la donnée (ex. le fichier OpenStreetMap
--    des hôpitaux dans la donnée GeoAlgeria « sante ») : fichiers.source_id, fichiers.licence_code.
--    La fiche propose alors de télécharger les données de chaque source.
-- 2. Une nouvelle version publiée par une source garde les fichiers des autres sources (trigger), quel que soit
--    celui qui publie (API, script GeoAlgeria).
-- 3. Tables des synchronisations (réglages, dernière exécution, historique), lues par l'administration.
-- 4. Catégorie « Énergie & eau » pour les nouvelles données OpenStreetMap.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Source et licence de chaque fichier (null = celles de la donnée)
-- ---------------------------------------------------------------------
alter table public.fichiers
  add column if not exists source_id uuid references public.sources (id) on delete set null,
  add column if not exists licence_code text references public.licences (code) on update cascade;

comment on column public.fichiers.source_id is 'Source du fichier quand elle diffère de celle de la donnée (null = source de la donnée).';
comment on column public.fichiers.licence_code is 'Licence du fichier quand elle diffère de celle de la donnée (null = licence de la donnée).';

create index if not exists fichiers_source_idx on public.fichiers (source_id) where source_id is not null;

-- ---------------------------------------------------------------------
-- 2. Nouvelle version : les fichiers des autres sources sont recopiés depuis la version précédente
--    Source « effective » d'un fichier = fichiers.source_id, sinon la source de la donnée.
--    Un fichier de l'ancienne version est recopié si sa source n'a aucun fichier dans la nouvelle version
--    et si la nouvelle version n'a pas déjà un fichier du même nom et du même format.
--    Version encore vide au moment du changement (fichiers ajoutés après) : rien n'est recopié.
-- ---------------------------------------------------------------------
create or replace function public.conserver_fichiers_autres_sources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a_un_principal boolean;
begin
  if old.version_courante_id is null or new.version_courante_id is null then
    return null;
  end if;
  if not exists (select 1 from public.fichiers where version_id = new.version_courante_id) then
    return null;
  end if;
  select bool_or(principal) into a_un_principal from public.fichiers where version_id = new.version_courante_id;

  insert into public.fichiers (version_id, format, cle_stockage, nom, principal, taille_octets, sha256, source_id, licence_code)
  select new.version_courante_id, f.format, f.cle_stockage, f.nom,
         f.principal and not coalesce(a_un_principal, false),
         f.taille_octets, f.sha256, f.source_id, f.licence_code
  from public.fichiers f
  where f.version_id = old.version_courante_id
    and coalesce(f.source_id, new.source_id) is not null
    and coalesce(f.source_id, new.source_id) not in (
      select coalesce(n.source_id, new.source_id)
      from public.fichiers n
      where n.version_id = new.version_courante_id and coalesce(n.source_id, new.source_id) is not null
    )
    and not exists (
      select 1 from public.fichiers n
      where n.version_id = new.version_courante_id and n.nom is not distinct from f.nom and n.format = f.format
    );
  return null;
end;
$$;

revoke execute on function public.conserver_fichiers_autres_sources() from public, anon, authenticated;

drop trigger if exists conserver_fichiers_autres_sources on public.datasets;
create trigger conserver_fichiers_autres_sources
  after update of version_courante_id on public.datasets
  for each row
  when (old.version_courante_id is distinct from new.version_courante_id)
  execute function public.conserver_fichiers_autres_sources();

-- ---------------------------------------------------------------------
-- 3. Synchronisations
--    mode « interne » : lancée par data-dz (GitHub Action de l'API), réglages pris en compte ;
--    mode « externe » : script d'un partenaire (GeoAlgeria), data-dz n'en affiche que l'état.
-- ---------------------------------------------------------------------
create table if not exists public.synchronisations (
  code               text primary key check (code ~ '^[a-z0-9-]{2,40}$'),
  nom                text not null check (char_length(nom) between 1 and 100),
  source_id          uuid references public.sources (id) on delete set null,
  mode               text not null default 'interne' check (mode in ('interne', 'externe')),
  actif              boolean not null default true,
  intervalle_jours   integer not null default 30 check (intervalle_jours between 1 and 365),
  forcer             boolean not null default false,
  derniere_execution timestamptz,
  dernier_statut     text check (dernier_statut in ('reussie', 'partielle', 'echec', 'essai')),
  dernier_rapport    jsonb,
  config             jsonb not null default '{}'::jsonb,
  description        text check (char_length(description) <= 1000),
  cree_le            timestamptz not null default now(),
  mis_a_jour_le      timestamptz not null default now()
);

comment on table public.synchronisations is 'Sources de données renouvelées automatiquement : réglages (intervalle, actif, forcer) et dernière exécution. Écrite par l''API uniquement.';

create table if not exists public.synchro_executions (
  id            uuid primary key default gen_random_uuid(),
  synchro_code  text not null references public.synchronisations (code) on update cascade on delete cascade,
  debut         timestamptz not null default now(),
  fin           timestamptz,
  statut        text not null check (statut in ('reussie', 'partielle', 'echec', 'essai')),
  declencheur   text not null default 'planifie' check (declencheur in ('planifie', 'manuel', 'forcer')),
  resume        text check (char_length(resume) <= 2000),
  rapport       jsonb not null default '{}'::jsonb
);

create index if not exists synchro_executions_code_idx on public.synchro_executions (synchro_code, debut desc);

alter table public.synchronisations   enable row level security;
alter table public.synchro_executions enable row level security;

drop policy if exists "Synchronisations : lecture par les gestionnaires" on public.synchronisations;
create policy "Synchronisations : lecture par les gestionnaires" on public.synchronisations
  for select to authenticated using (public.a_permission('synchro.gerer'));
drop policy if exists "Exécutions : lecture par les gestionnaires" on public.synchro_executions;
create policy "Exécutions : lecture par les gestionnaires" on public.synchro_executions
  for select to authenticated using (public.a_permission('synchro.gerer'));

grant select on public.synchronisations, public.synchro_executions to authenticated;
grant all on public.synchronisations, public.synchro_executions to service_role;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description) values
  ('openstreetmap', 'OpenStreetMap', (select id from public.sources where slug = 'openstreetmap'), 'interne', 30,
   'Extrait Geofabrik de l''Algérie filtré par catégories (scripts/osm du dépôt de l''API, GitHub Action quotidienne qui ne travaille qu''à l''échéance). Les données s''ajoutent aux précédentes, rien n''est supprimé.'),
  ('geoalgeria', 'GeoAlgeria', (select id from public.sources where slug = 'geoalgeria'), 'externe', 7,
   'Script hebdomadaire de GeoAlgeria (externe) : data-dz affiche ses dernières versions, il ne le pilote pas.')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 4. Catégorie des nouvelles données OpenStreetMap (centrales, châteaux d'eau)
-- ---------------------------------------------------------------------
insert into public.categories (slug, nom, icone, ordre)
values ('energie', '{"fr": "Énergie & eau", "en": "Energy & water", "ar": "الطاقة والمياه"}', 'bolt', 140)
on conflict (slug) do nothing;
