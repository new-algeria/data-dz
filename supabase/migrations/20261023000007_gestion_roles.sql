-- =====================================================================
-- data-dz · Bloc 7 : gestion des rôles par les administrateurs
-- À coller dans Supabase → SQL Editor → New query → Run (après le bloc 6)
--
-- Les membres ne peuvent pas écrire la colonne profils.role (droits de la base) :
-- un administrateur la change uniquement par cette fonction, qui vérifie tout côté serveur.
--   - réservé aux administrateurs (public.est_admin()) ;
--   - le rôle d'un administrateur ne peut pas être changé depuis le site ;
--   - le rôle « admin » ne peut pas être donné depuis le site.
-- Nommer ou retirer un administrateur reste une opération manuelle (SQL Editor).
-- =====================================================================

create or replace function public.changer_role(utilisateur_id uuid, nouveau_role public.role_utilisateur)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_actuel public.role_utilisateur;
begin
  if not public.est_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if nouveau_role = 'admin' then
    raise exception 'Le rôle admin ne peut pas être donné depuis le site' using errcode = '42501';
  end if;

  select role into role_actuel from public.profils where id = utilisateur_id for update;
  if not found then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;
  if role_actuel = 'admin' then
    raise exception 'Le rôle d''un administrateur ne peut pas être changé depuis le site' using errcode = '42501';
  end if;

  update public.profils set role = nouveau_role where id = utilisateur_id;
end;
$$;

revoke execute on function public.changer_role(uuid, public.role_utilisateur) from public, anon;
grant  execute on function public.changer_role(uuid, public.role_utilisateur) to authenticated;
