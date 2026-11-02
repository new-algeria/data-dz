-- =====================================================================
-- data-dz · Rôles personnalisés et permissions
-- À coller dans Supabase → SQL Editor → New query → Run, AVANT de déployer le site et l'API.
--
-- Un rôle = une ligne de public.roles :
--   - role_base : niveau d'accès de la base (membre, contributeur, moderateur ; admin réservé au rôle système).
--     Il est recopié dans profils.role : toute la RLS existante (est_admin(), est_moderateur()…) reste valable.
--   - permissions : droits en plus, vérifiés par public.a_permission() (base) et par l'API.
-- Les 4 rôles système (membre, contributeur, moderateur, admin) ne se suppriment pas.
-- profils.role_code désigne le rôle du membre ; profils.role (enum) en est toujours le niveau de base.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table des rôles
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  code          text primary key check (code ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  nom           jsonb not null check (jsonb_typeof(nom) = 'object' and char_length(trim(coalesce(nom ->> 'fr', ''))) between 1 and 60),
  description   jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  role_base     public.role_utilisateur not null default 'membre',
  permissions   text[] not null default '{}'
                check (permissions <@ array['donnees.gerer', 'membres.gerer', 'synchro.gerer', 'djazai.illimite']::text[]),
  couleur       text not null default 'gris' check (couleur in ('gris', 'bleu', 'vert', 'ambre', 'rouge', 'violet', 'rose')),
  systeme       boolean not null default false,
  ordre         integer not null default 100,
  cree_le       timestamptz not null default now(),
  mis_a_jour_le timestamptz not null default now(),
  constraint roles_admin_systeme check (systeme or role_base <> 'admin')
);

comment on table public.roles is 'Rôles des membres : niveau de base (profils.role) + permissions. Écrits uniquement par enregistrer_role / supprimer_role.';

insert into public.roles (code, nom, description, role_base, systeme, ordre, couleur) values
  ('membre',
   '{"fr": "Membre", "en": "Member", "ar": "عضو"}',
   '{"fr": "Peut voter, commenter, suivre des données et en proposer.", "en": "Can vote, comment, follow and submit datasets.", "ar": "يمكنه التصويت والتعليق ومتابعة البيانات واقتراحها."}',
   'membre', true, 10, 'gris'),
  ('contributeur',
   '{"fr": "Contributeur", "en": "Contributor", "ar": "مساهم"}',
   '{"fr": "Comme un membre ; donné automatiquement quand une de ses propositions est publiée.", "en": "Like a member; given automatically when one of their submissions is published.", "ar": "مثل العضو؛ يُمنح تلقائيًا عند نشر أحد اقتراحاته."}',
   'contributeur', true, 20, 'bleu'),
  ('moderateur',
   '{"fr": "Modérateur", "en": "Moderator", "ar": "مشرف"}',
   '{"fr": "Relit et décide des propositions, masque des commentaires, change le statut des jeux de données.", "en": "Reviews submissions, hides comments, changes dataset status.", "ar": "يراجع الاقتراحات ويخفي التعليقات ويغيّر حالة البيانات."}',
   'moderateur', true, 30, 'ambre'),
  ('admin',
   '{"fr": "Administrateur", "en": "Administrator", "ar": "مدير"}',
   '{"fr": "Tous les droits.", "en": "All rights.", "ar": "كل الصلاحيات."}',
   'admin', true, 40, 'violet')
on conflict (code) do nothing;

alter table public.roles enable row level security;
drop policy if exists "Rôles : lecture publique" on public.roles;
create policy "Rôles : lecture publique" on public.roles for select to anon, authenticated using (true);
grant select on public.roles to anon, authenticated;
grant all on public.roles to service_role;

-- ---------------------------------------------------------------------
-- 2. Rôle de chaque membre
-- ---------------------------------------------------------------------
alter table public.profils add column if not exists role_code text;
update public.profils set role_code = role::text where role_code is null;
alter table public.profils
  alter column role_code set default 'membre',
  alter column role_code set not null,
  drop constraint if exists profils_role_code_fk,
  add constraint profils_role_code_fk foreign key (role_code) references public.roles (code) on update cascade;
create index if not exists profils_role_code_idx on public.profils (role_code);

-- role et role_code restent cohérents, quel que soit celui qui est écrit :
--   - role_code changé → role = son niveau de base ;
--   - role seul changé (ex. passage automatique en contributeur, SQL Editor) → role_code = le rôle système
--     correspondant, sauf si le rôle personnalisé actuel a déjà ce niveau.
-- Fonction « security invoker » : current_user est celui qui écrit ; un membre (authenticated) ne change jamais un rôle.
create or replace function public.synchroniser_role_profil()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base public.role_utilisateur;
begin
  if tg_op = 'UPDATE' and current_user in ('anon', 'authenticated')
     and (new.role is distinct from old.role or new.role_code is distinct from old.role_code) then
    raise exception 'Le rôle se change avec changer_role' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.role_code is null or (new.role_code = 'membre' and new.role <> 'membre') then
      new.role_code := new.role::text;
    end if;
  end if;

  if tg_op = 'INSERT' or new.role_code is distinct from old.role_code then
    select r.role_base into base from public.roles r where r.code = new.role_code;
    if base is not null then new.role := base; end if;
  elsif new.role is distinct from old.role then
    select r.role_base into base from public.roles r where r.code = new.role_code;
    if base is distinct from new.role then new.role_code := new.role::text; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists synchroniser_role_profil on public.profils;
create trigger synchroniser_role_profil
  before insert or update of role, role_code on public.profils
  for each row execute function public.synchroniser_role_profil();

-- Changer le niveau de base d'un rôle le change pour tous ses membres.
create or replace function public.propager_role_base()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profils set role = new.role_base where role_code = new.code and role is distinct from new.role_base;
  return null;
end;
$$;
revoke execute on function public.propager_role_base() from public, anon, authenticated;

drop trigger if exists propager_role_base on public.roles;
create trigger propager_role_base
  after update of role_base on public.roles
  for each row when (old.role_base is distinct from new.role_base)
  execute function public.propager_role_base();

-- ---------------------------------------------------------------------
-- 3. Permissions
-- ---------------------------------------------------------------------
-- Vrai si le membre connecté est admin, ou si son rôle porte cette permission.
create or replace function public.a_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profils p
    join public.roles r on r.code = p.role_code
    where p.id = (select auth.uid())
      and (p.role = 'admin' or permission = any (r.permissions))
  );
$$;
revoke execute on function public.a_permission(text) from public;
grant execute on function public.a_permission(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. Attribuer un rôle (remplace changer_role(uuid, role_utilisateur) du bloc 7)
--    - admin : tout rôle sauf « admin » (nommer un admin reste manuel, SQL Editor) ;
--    - permission membres.gerer : seulement des rôles sans permission, à des membres qui n'en ont pas, jamais à soi-même ;
--    - le rôle d'un administrateur ne change jamais depuis le site.
-- ---------------------------------------------------------------------
drop function if exists public.changer_role(uuid, public.role_utilisateur);

create or replace function public.changer_role(utilisateur_id uuid, nouveau_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible public.roles;
  actuel public.role_utilisateur;
  permissions_actuelles text[];
  admin boolean := public.est_admin();
begin
  if not admin and not public.a_permission('membres.gerer') then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  select * into cible from public.roles where code = nouveau_role;
  if not found then
    raise exception 'Rôle inconnu' using errcode = 'P0002';
  end if;
  if cible.role_base = 'admin' then
    raise exception 'Le rôle admin ne peut pas être donné depuis le site' using errcode = '42501';
  end if;

  select p.role, r.permissions into actuel, permissions_actuelles
  from public.profils p join public.roles r on r.code = p.role_code
  where p.id = utilisateur_id
  for update of p;
  if not found then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;
  if actuel = 'admin' then
    raise exception 'Le rôle d''un administrateur ne peut pas être changé depuis le site' using errcode = '42501';
  end if;

  if not admin then
    if utilisateur_id = (select auth.uid()) then
      raise exception 'Impossible de changer son propre rôle' using errcode = '42501';
    end if;
    if cardinality(cible.permissions) > 0 or cardinality(permissions_actuelles) > 0 then
      raise exception 'Seul un administrateur gère les rôles qui ont des permissions' using errcode = '42501';
    end if;
  end if;

  update public.profils set role_code = cible.code where id = utilisateur_id;
end;
$$;

revoke execute on function public.changer_role(uuid, text) from public, anon;
grant  execute on function public.changer_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Créer, modifier, supprimer un rôle (administrateurs uniquement)
-- ---------------------------------------------------------------------
create or replace function public.enregistrer_role(
  p_code text,
  p_nom jsonb,
  p_description jsonb default '{}'::jsonb,
  p_role_base public.role_utilisateur default 'membre',
  p_permissions text[] default '{}',
  p_couleur text default 'gris',
  p_ordre integer default null
)
returns public.roles
language plpgsql
security definer
set search_path = ''
as $$
declare
  existant public.roles;
  resultat public.roles;
begin
  if not public.est_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  select * into existant from public.roles where code = p_code;
  if found then
    if existant.code = 'admin' then
      raise exception 'Le rôle administrateur ne se modifie pas' using errcode = '42501';
    end if;
    -- Rôle système : son niveau de base ne change pas (la modération et la RLS en dépendent).
    update public.roles set
      nom = p_nom,
      description = coalesce(p_description, '{}'::jsonb),
      role_base = case when existant.systeme then existant.role_base else p_role_base end,
      permissions = coalesce(p_permissions, '{}'),
      couleur = coalesce(p_couleur, 'gris'),
      ordre = coalesce(p_ordre, existant.ordre),
      mis_a_jour_le = now()
    where code = p_code
    returning * into resultat;
  else
    if p_role_base = 'admin' then
      raise exception 'Un rôle personnalisé ne peut pas avoir le niveau administrateur' using errcode = '42501';
    end if;
    insert into public.roles (code, nom, description, role_base, permissions, couleur, ordre)
    values (p_code, p_nom, coalesce(p_description, '{}'::jsonb), p_role_base, coalesce(p_permissions, '{}'), coalesce(p_couleur, 'gris'),
            coalesce(p_ordre, (select coalesce(max(ordre), 40) + 10 from public.roles)))
    returning * into resultat;
  end if;
  return resultat;
end;
$$;

revoke execute on function public.enregistrer_role(text, jsonb, jsonb, public.role_utilisateur, text[], text, integer) from public, anon;
grant  execute on function public.enregistrer_role(text, jsonb, jsonb, public.role_utilisateur, text[], text, integer) to authenticated;

-- Les membres du rôle supprimé reviennent au rôle système de même niveau.
create or replace function public.supprimer_role(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existant public.roles;
begin
  if not public.est_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  select * into existant from public.roles where code = p_code for update;
  if not found then
    raise exception 'Rôle inconnu' using errcode = 'P0002';
  end if;
  if existant.systeme then
    raise exception 'Un rôle système ne se supprime pas' using errcode = '42501';
  end if;
  update public.profils set role_code = existant.role_base::text where role_code = p_code;
  delete from public.roles where code = p_code;
end;
$$;

revoke execute on function public.supprimer_role(text) from public, anon;
grant  execute on function public.supprimer_role(text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Notification « rôle attribué » (remplace celle de 20261102000014) : nom du rôle lu dans public.roles
-- ---------------------------------------------------------------------
create or replace function public.notifier_role_attribue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  libelle_role jsonb;
begin
  if new.role_code = 'membre' then
    return new;
  end if;
  select nom into libelle_role from public.roles where code = new.role_code;

  insert into public.notifications (utilisateur_id, type, donnees, lien)
  values (
    new.id,
    'role_attribue',
    jsonb_build_object('role', coalesce(libelle_role, jsonb_build_object('fr', new.role_code))),
    '/profile'
  );
  return new;
end;
$$;

revoke execute on function public.notifier_role_attribue() from public, anon, authenticated;

-- « update of role, role_code » : role_code peut aussi être changé par le trigger synchroniser_role_profil.
drop trigger if exists notifier_role_attribue on public.profils;
create trigger notifier_role_attribue
  after update of role, role_code on public.profils
  for each row
  when (old.role_code is distinct from new.role_code)
  execute function public.notifier_role_attribue();
