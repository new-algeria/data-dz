-- data-dz · Suppression de son propre compte (loi 18-07 : droit à l'effacement)
-- À appliquer avant de déployer le site (bouton « Supprimer mon compte » de /profile). Relançable.
--
-- Le site supprime d'abord les fichiers du membre (avatar, fichiers de ses propositions) avec ses propres droits,
-- puis appelle rpc("supprimer_mon_compte"). La fonction supprime le profil puis le compte d'authentification :
--   - votes, favoris, notifications, propositions, quota DjazAI : supprimés (on delete cascade) ;
--   - commentaires et idées : gardés sans auteur (on delete set null), comme un commentaire anonyme ;
--   - statistiques de téléchargement : détachées du compte (on delete set null).
-- Un administrateur ne peut pas supprimer son compte ainsi (risque de perdre le dernier accès admin) : code DZ001.

create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if exists (select 1 from public.profils where id = uid and role = 'admin') then
    raise exception 'Un administrateur ne peut pas supprimer son compte depuis le site' using errcode = 'DZ001';
  end if;
  delete from public.profils where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

-- Vérification : la fonction existe et n'est accessible qu'aux membres connectés.
select proname, prosecdef from pg_proc where proname = 'supprimer_mon_compte';
