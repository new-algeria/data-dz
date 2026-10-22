-- =====================================================================
-- data-dz · Bloc 6 : liens des notifications en anglais
-- À coller dans Supabase → SQL Editor → New query → Run (après le bloc 5)
--   /donnees/…               → /datasets/…
--   /mes-propositions/…      → /my-submissions/…
--   /moderation/propositions → /moderation/submissions
--   #commentaire-…           → #comment-…
-- =====================================================================

create or replace function public.notifier_nouvelle_soumission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (utilisateur_id, type, donnees, lien)
  select p.id, 'nouvelle_soumission',
         jsonb_build_object('soumission_id', new.id, 'titre', new.titre, 'type', new.type),
         '/moderation/submissions/' || new.id
  from public.profils p
  where p.role in ('moderateur', 'admin') and p.id <> new.soumis_par;
  return null;
end;
$$;

create or replace function public.notifier_revue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s record;
begin
  select id, soumis_par, titre into s from public.soumissions where id = new.soumission_id;
  if s.soumis_par is distinct from new.relecteur_id then
    insert into public.notifications (utilisateur_id, type, donnees, lien)
    values (s.soumis_par, 'revue',
            jsonb_build_object('soumission_id', s.id, 'titre', s.titre, 'decision', new.decision, 'commentaire', new.commentaire),
            '/my-submissions/' || s.id);
  end if;
  return null;
end;
$$;

create or replace function public.recompenser_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  slug_publie text;
begin
  if new.statut = 'publiee' and old.statut is distinct from 'publiee' then
    select slug into slug_publie from public.datasets where id = new.dataset_publie_id;
    update public.profils
    set reputation = reputation + 50,
        role = case when role = 'membre' then 'contributeur'::public.role_utilisateur else role end
    where id = new.soumis_par;
    insert into public.notifications (utilisateur_id, type, donnees, lien)
    values (new.soumis_par, 'publiee',
            jsonb_build_object('soumission_id', new.id, 'titre', new.titre, 'slug', slug_publie),
            case when slug_publie is not null then '/datasets/' || slug_publie end);
  end if;
  return null;
end;
$$;

create or replace function public.notifier_reponse()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  auteur_parent uuid;
  slug_dataset text;
begin
  if new.parent_id is null then
    return null;
  end if;
  select auteur_id into auteur_parent from public.commentaires where id = new.parent_id;
  if auteur_parent is not null and auteur_parent is distinct from new.auteur_id then
    select slug into slug_dataset from public.datasets where id = new.dataset_id;
    insert into public.notifications (utilisateur_id, type, donnees, lien)
    values (auteur_parent, 'reponse',
            jsonb_build_object('commentaire_id', new.id, 'dataset_slug', slug_dataset),
            '/datasets/' || slug_dataset || '#comment-' || new.id);
  end if;
  return null;
end;
$$;

create or replace function public.notifier_nouvelle_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  numero_version text;
begin
  if old.version_courante_id is not null
     and new.version_courante_id is distinct from old.version_courante_id
     and new.statut = 'publie' then
    select numero into numero_version from public.versions where id = new.version_courante_id;
    insert into public.notifications (utilisateur_id, type, donnees, lien)
    select f.utilisateur_id, 'nouvelle_version',
           jsonb_build_object('dataset_slug', new.slug, 'titre', new.titre, 'version', numero_version),
           '/datasets/' || new.slug
    from public.favoris f
    where f.dataset_id = new.id;
  end if;
  return null;
end;
$$;

-- Notifications déjà créées
update public.notifications set lien = replace(replace(replace(replace(lien,
  '/moderation/propositions/', '/moderation/submissions/'),
  '/mes-propositions/', '/my-submissions/'),
  '/donnees/', '/datasets/'),
  '#commentaire-', '#comment-')
where lien is not null;
