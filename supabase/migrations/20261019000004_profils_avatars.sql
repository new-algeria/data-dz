-- =====================================================================
-- data-dz · Bloc 4 : prérequis pour l'authentification et les profils
-- À coller dans Supabase → SQL Editor → New query → Run
-- (et à ajouter dans supabase/migrations/ pour le développement local)
--
--   1. Pseudos réservés (admin, moderateur, support…) interdits
--   2. Liens du profil (site web, avatar) obligatoirement en http(s)
--   3. Stockage des avatars (bucket "avatars", 2 Mo max, images uniquement)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Pseudos réservés
-- ---------------------------------------------------------------------
create or replace function public.pseudo_reserve(pseudo text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(pseudo) = any (array[
    'admin', 'administrateur', 'administrator', 'moderateur', 'moderator', 'modo',
    'support', 'contact', 'equipe', 'team', 'staff', 'officiel', 'official',
    'root', 'system', 'systeme', 'api', 'www', 'mail',
    'data-dz', 'datadz', 'new-algeria', 'newalgeria', 'geoalgeria',
    'membres', 'membre', 'profil', 'connexion', 'inscription', 'parametres',
    'null', 'undefined', 'anonyme', 'anonymous'
  ]);
$$;

grant execute on function public.pseudo_reserve(text) to anon, authenticated;

-- Renomme les éventuels profils existants qui utilisent un pseudo réservé
update public.profils
set pseudo = left(pseudo, 24) || '-' || substr(md5(id::text), 1, 4)
where public.pseudo_reserve(pseudo);

alter table public.profils
  drop constraint if exists profils_pseudo_non_reserve,
  add constraint profils_pseudo_non_reserve check (not public.pseudo_reserve(pseudo));

-- Le pseudo généré à l'inscription évite aussi les noms réservés
create or replace function public.creer_profil_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta         jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base_pseudo  text;
  pseudo_final text;
begin
  -- GitHub fournit user_name, Google full_name ; sinon on prend le début de l'email
  base_pseudo := lower(coalesce(meta ->> 'user_name', meta ->> 'preferred_username', split_part(new.email, '@', 1), ''));
  base_pseudo := regexp_replace(base_pseudo, '[^a-z0-9_-]', '', 'g');
  base_pseudo := left(base_pseudo, 24);
  if char_length(base_pseudo) < 3 then
    base_pseudo := 'utilisateur';
  end if;

  pseudo_final := base_pseudo;
  while public.pseudo_reserve(pseudo_final)
        or exists (select 1 from public.profils where pseudo = pseudo_final) loop
    pseudo_final := base_pseudo || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profils (id, pseudo, nom_affiche, avatar_url)
  values (
    new.id,
    pseudo_final,
    coalesce(meta ->> 'full_name', meta ->> 'name'),
    meta ->> 'avatar_url'
  );
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. Liens du profil : uniquement http(s), jamais "javascript:" ou autre
-- ---------------------------------------------------------------------
update public.profils set site_web   = null where site_web   is not null and site_web   !~* '^https?://';
update public.profils set avatar_url = null where avatar_url is not null and avatar_url !~* '^https://';

alter table public.profils
  drop constraint if exists profils_site_web_http,
  add constraint profils_site_web_http check (site_web is null or site_web ~* '^https?://[^\s]+$'),
  drop constraint if exists profils_avatar_https,
  add constraint profils_avatar_https check (avatar_url is null or avatar_url ~* '^https://[^\s]+$');


-- ---------------------------------------------------------------------
-- 3. Stockage des avatars
--    Chemin imposé : avatars/<id de l'utilisateur>/<nom du fichier>
--    URL publique : <SUPABASE_URL>/storage/v1/object/public/avatars/<id>/<fichier>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatars : lecture publique"            on storage.objects;
drop policy if exists "Avatars : chacun dépose le sien"        on storage.objects;
drop policy if exists "Avatars : chacun remplace le sien"      on storage.objects;
drop policy if exists "Avatars : chacun supprime le sien"      on storage.objects;

create policy "Avatars : lecture publique"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "Avatars : chacun dépose le sien"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatars : chacun remplace le sien"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatars : chacun supprime le sien"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
