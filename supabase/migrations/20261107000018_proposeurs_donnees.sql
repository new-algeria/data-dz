-- =====================================================================
-- data-dz · Qui a proposé une donnée publiée
-- À coller dans Supabase → SQL Editor → New query → Run, AVANT de déployer le site.
-- Relançable sans erreur (create or replace).
--
-- Les propositions (`soumissions`) restent privées (RLS : l'auteur et les modérateurs). Ces deux fonctions
-- ne révèlent que le minimum, et seulement pour une donnée PUBLIÉE née d'une proposition PUBLIÉE :
-- le profil public de son auteur (pseudo, nom affiché, avatar), comme sur sa page publique.
-- Une proposition de mise à jour ne compte pas : « proposée par » désigne celui qui a apporté la donnée.
-- =====================================================================

-- Fiche d'une donnée : l'auteur de la proposition qui l'a créée (aucune ligne sinon).
create or replace function public.proposeur_donnee(p_dataset_id uuid)
returns table (pseudo text, nom_affiche text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.pseudo, p.nom_affiche, p.avatar_url
  from public.soumissions s
  join public.datasets d on d.id = s.dataset_publie_id
  join public.profils p on p.id = s.soumis_par
  where s.dataset_publie_id = p_dataset_id
    and s.type = 'nouvelle_donnee'
    and s.statut = 'publiee'
    and d.statut = 'publie'
  order by s.cree_le
  limit 1;
$$;

-- Page d'un membre : les données publiées issues de ses propositions, les plus récentes d'abord.
create or replace function public.donnees_proposees_par(p_pseudo text)
returns table (dataset_id uuid, slug text, publiee_le timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.slug, s.mis_a_jour_le
  from public.soumissions s
  join public.datasets d on d.id = s.dataset_publie_id
  join public.profils p on p.id = s.soumis_par
  where p.pseudo = lower(p_pseudo)
    and s.type = 'nouvelle_donnee'
    and s.statut = 'publiee'
    and d.statut = 'publie'
  order by s.mis_a_jour_le desc
  limit 200;
$$;

revoke all on function public.proposeur_donnee(uuid) from public;
revoke all on function public.donnees_proposees_par(text) from public;
grant execute on function public.proposeur_donnee(uuid) to anon, authenticated;
grant execute on function public.donnees_proposees_par(text) to anon, authenticated;

comment on function public.proposeur_donnee(uuid) is
  'Profil public (pseudo, nom affiché, avatar) de l''auteur de la proposition qui a créé une donnée publiée.';
comment on function public.donnees_proposees_par(text) is
  'Données publiées issues des propositions publiées d''un membre (par pseudo), les plus récentes d''abord.';
