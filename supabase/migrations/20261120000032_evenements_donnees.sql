-- Statistiques datées : chaque vue de fiche et chaque téléchargement est enregistré avec sa date, sa donnée,
-- son fichier, son format, son origine (site ou API publique) et, pour un téléchargement fait depuis le site par un
-- membre connecté, le compte. Les compteurs cumulés datasets.nb_vues / nb_telechargements continuent d'être tenus.
-- Lecture réservée aux admins (RLS et fonctions security definer) ; écriture par l'API seulement (service_role).
-- Historique conservé sans limite de durée (un compte supprimé est détaché : utilisateur_id passe à null).
-- À appliquer dans Supabase SQL Editor AVANT de déployer l'API et le site. Réexécutable sans erreur.

-- ---------------------------------------------------------------------
-- 1. Table des événements
-- ---------------------------------------------------------------------
create table if not exists public.evenements_donnees (
  id              bigint generated always as identity primary key,
  dataset_id      uuid not null references public.datasets (id) on delete cascade,
  type            text not null check (type in ('vue', 'telechargement')),
  cree_le         timestamptz not null default now(),
  utilisateur_id  uuid references auth.users (id) on delete set null,
  fichier         text check (char_length(fichier) <= 200),
  format          text check (char_length(format) <= 20),
  origine         text not null default 'api' check (origine in ('site', 'api'))
);

comment on table public.evenements_donnees is
  'Vues de fiches et téléchargements datés. Le compte n''est renseigné que pour un téléchargement fait depuis le site par un membre connecté. Lecture : admins ; écriture : API (service_role).';

create index if not exists evenements_donnees_date_idx on public.evenements_donnees (cree_le);
create index if not exists evenements_donnees_donnee_idx on public.evenements_donnees (dataset_id, cree_le);
create index if not exists evenements_donnees_compte_idx on public.evenements_donnees (utilisateur_id, cree_le) where utilisateur_id is not null;

alter table public.evenements_donnees enable row level security;

drop policy if exists "evenements_donnees_lecture_admin" on public.evenements_donnees;
create policy "evenements_donnees_lecture_admin" on public.evenements_donnees
  for select to authenticated using (public.est_admin());

revoke all on public.evenements_donnees from anon, authenticated;
grant select on public.evenements_donnees to authenticated;

-- ---------------------------------------------------------------------
-- 2. Enregistrement (appelé par l'API) : compteur cumulé + événement daté
-- ---------------------------------------------------------------------
create or replace function public.enregistrer_evenement_donnee(
  p_slug        text,
  p_evenement   text,
  p_utilisateur uuid default null,
  p_fichier     text default null,
  p_format      text default null,
  p_origine     text default 'api'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  compteur bigint;
  donnee   uuid;
begin
  if p_evenement = 'vue' then
    update public.datasets set nb_vues = nb_vues + 1
    where slug = p_slug and statut = 'publie'
    returning nb_vues, id into compteur, donnee;
  elsif p_evenement = 'telechargement' then
    update public.datasets set nb_telechargements = nb_telechargements + 1
    where slug = p_slug and statut = 'publie'
    returning nb_telechargements, id into compteur, donnee;
  else
    raise exception 'Type de compteur inconnu' using errcode = '22023';
  end if;

  if compteur is null then
    raise exception 'Jeu de données introuvable ou non publié' using errcode = 'P0002';
  end if;

  insert into public.evenements_donnees (dataset_id, type, utilisateur_id, fichier, format, origine)
  values (
    donnee,
    p_evenement,
    case when p_evenement = 'telechargement' then p_utilisateur end,  -- jamais de compte pour une vue
    left(p_fichier, 200),
    left(p_format, 20),
    case when p_origine = 'site' then 'site' else 'api' end
  );

  return compteur;
end;
$$;

revoke all on function public.enregistrer_evenement_donnee(text, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.enregistrer_evenement_donnee(text, text, uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 3. Lectures pour la page /admin/analytics (admins seulement)
-- ---------------------------------------------------------------------
-- Contrôle commun : admin et période valide (400 jours au plus).
create or replace function public.analytics_verifier(p_debut timestamptz, p_fin timestamptz)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if p_debut is null or p_fin is null or p_fin <= p_debut or p_fin - p_debut > interval '400 days' then
    raise exception 'Période invalide (400 jours au plus)' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.analytics_verifier(timestamptz, timestamptz) from public, anon;
grant execute on function public.analytics_verifier(timestamptz, timestamptz) to authenticated;

-- Vues et téléchargements par jour, semaine ou mois, à l'heure d'Alger (périodes sans événement incluses, à zéro).
create or replace function public.analytics_series(p_debut timestamptz, p_fin timestamptz, p_pas text default 'day')
returns table (periode timestamptz, vues bigint, telechargements bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.analytics_verifier(p_debut, p_fin);
  if p_pas not in ('day', 'week', 'month') then
    raise exception 'Pas inconnu' using errcode = '22023';
  end if;
  return query
    with periodes as (
      select generate_series(date_trunc(p_pas, p_debut, 'Africa/Algiers'), date_trunc(p_pas, p_fin - interval '1 second', 'Africa/Algiers'), ('1 ' || p_pas)::interval) as periode
    ),
    comptes as (
      select date_trunc(p_pas, e.cree_le, 'Africa/Algiers') as periode,
             count(*) filter (where e.type = 'vue') as vues,
             count(*) filter (where e.type = 'telechargement') as telechargements
      from public.evenements_donnees e
      where e.cree_le >= p_debut and e.cree_le < p_fin
      group by 1
    )
    select p.periode, coalesce(c.vues, 0)::bigint, coalesce(c.telechargements, 0)::bigint
    from periodes p left join comptes c using (periode)
    order by p.periode;
end;
$$;
revoke all on function public.analytics_series(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.analytics_series(timestamptz, timestamptz, text) to authenticated;

-- Données les plus vues et les plus téléchargées sur la période.
create or replace function public.analytics_top_donnees(p_debut timestamptz, p_fin timestamptz, p_limite integer default 10)
returns table (slug text, titre jsonb, vues bigint, telechargements bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.analytics_verifier(p_debut, p_fin);
  return query
    select d.slug, d.titre,
           count(*) filter (where e.type = 'vue')::bigint,
           count(*) filter (where e.type = 'telechargement')::bigint
    from public.evenements_donnees e
    join public.datasets d on d.id = e.dataset_id
    where e.cree_le >= p_debut and e.cree_le < p_fin
    group by d.slug, d.titre
    order by 4 desc, 3 desc, d.slug
    limit least(greatest(coalesce(p_limite, 10), 1), 50);
end;
$$;
revoke all on function public.analytics_top_donnees(timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.analytics_top_donnees(timestamptz, timestamptz, integer) to authenticated;

-- Répartition des téléchargements par format et par origine (site / API).
create or replace function public.analytics_repartition(p_debut timestamptz, p_fin timestamptz)
returns table (dimension text, valeur text, nombre bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.analytics_verifier(p_debut, p_fin);
  return query
    select 'format'::text, coalesce(e.format, 'inconnu'), count(*)::bigint
    from public.evenements_donnees e
    where e.type = 'telechargement' and e.cree_le >= p_debut and e.cree_le < p_fin
    group by 2
    union all
    select 'origine'::text, e.origine, count(*)::bigint
    from public.evenements_donnees e
    where e.type = 'telechargement' and e.cree_le >= p_debut and e.cree_le < p_fin
    group by 2
    order by 1, 3 desc;
end;
$$;
revoke all on function public.analytics_repartition(timestamptz, timestamptz) from public, anon;
grant execute on function public.analytics_repartition(timestamptz, timestamptz) to authenticated;

-- Téléchargements par compte (membres connectés, depuis le site).
create or replace function public.analytics_comptes(p_debut timestamptz, p_fin timestamptz, p_limite integer default 50)
returns table (utilisateur_id uuid, pseudo text, nom_affiche text, avatar_url text, telechargements bigint, donnees bigint, dernier timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.analytics_verifier(p_debut, p_fin);
  return query
    select e.utilisateur_id, p.pseudo, p.nom_affiche, p.avatar_url,
           count(*)::bigint, count(distinct e.dataset_id)::bigint, max(e.cree_le)
    from public.evenements_donnees e
    left join public.profils p on p.id = e.utilisateur_id
    where e.type = 'telechargement' and e.utilisateur_id is not null
      and e.cree_le >= p_debut and e.cree_le < p_fin
    group by e.utilisateur_id, p.pseudo, p.nom_affiche, p.avatar_url
    order by 5 desc, 7 desc
    limit least(greatest(coalesce(p_limite, 50), 1), 200);
end;
$$;
revoke all on function public.analytics_comptes(timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.analytics_comptes(timestamptz, timestamptz, integer) to authenticated;

-- Détail des téléchargements d'un compte (200 derniers de la période).
create or replace function public.analytics_compte(p_utilisateur uuid, p_debut timestamptz, p_fin timestamptz)
returns table (cree_le timestamptz, slug text, titre jsonb, fichier text, format text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.analytics_verifier(p_debut, p_fin);
  return query
    select e.cree_le, d.slug, d.titre, e.fichier, e.format
    from public.evenements_donnees e
    join public.datasets d on d.id = e.dataset_id
    where e.type = 'telechargement' and e.utilisateur_id = p_utilisateur
      and e.cree_le >= p_debut and e.cree_le < p_fin
    order by e.cree_le desc
    limit 200;
end;
$$;
revoke all on function public.analytics_compte(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.analytics_compte(uuid, timestamptz, timestamptz) to authenticated;

-- Vérification : la table et les fonctions doivent exister (aucune ligne d'événement au départ).
select
  to_regclass('public.evenements_donnees') as table_evenements,
  to_regprocedure('public.enregistrer_evenement_donnee(text,text,uuid,text,text,text)') as enregistrement,
  to_regprocedure('public.analytics_series(timestamptz,timestamptz,text)') as series,
  to_regprocedure('public.analytics_comptes(timestamptz,timestamptz,integer)') as comptes;
