-- =====================================================================
-- data-dz · Bloc 5 : communauté
-- À coller dans Supabase → SQL Editor → New query → Run
-- (et à ajouter dans supabase/migrations/ pour le développement local)
--
--   1. Propositions de données (nouvelle donnée ou mise à jour) + fichiers + revues
--   2. Favoris (watchlist), votes (+1 / -1), commentaires
--   3. Compteurs automatiques sur datasets (score, favoris, commentaires)
--   4. Notifications
--   5. Fonctions : décider, renvoyer, retirer une proposition ; masquer un commentaire ;
--      marquer une proposition comme publiée (script de publication)
--   6. Stockage privé "soumissions" pour les fichiers proposés
--
-- Pré-requis : blocs 1 à 4.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Types
-- ---------------------------------------------------------------------
create type public.type_soumission   as enum ('nouvelle_donnee', 'mise_a_jour');
create type public.statut_soumission as enum ('en_attente', 'modifications_demandees', 'acceptee', 'refusee', 'retiree', 'publiee');
create type public.decision_revue    as enum ('commentaire', 'modifications_demandees', 'acceptee', 'refusee');


-- ---------------------------------------------------------------------
-- 1. Nouveaux compteurs sur datasets
-- ---------------------------------------------------------------------
alter table public.datasets
  add column if not exists nb_votes_pour   integer not null default 0,
  add column if not exists nb_votes_contre integer not null default 0,
  add column if not exists nb_favoris      integer not null default 0,
  add column if not exists nb_commentaires integer not null default 0;

create index if not exists datasets_score_idx on public.datasets (score desc);

-- La date de mise à jour ne bouge plus quand seuls les compteurs changent
drop trigger if exists maj_horodatage_datasets on public.datasets;
create trigger maj_horodatage_datasets
  before update of slug, titre, description, readme, categorie_slug, source_id, licence_code,
                   licence_details, url_source, mots_cles, wilayas, periode_debut, periode_fin,
                   frequence_maj, statut, version_courante_id, infos_source
  on public.datasets
  for each row execute function public.maj_horodatage();


-- ---------------------------------------------------------------------
-- 2. Propositions de données
-- ---------------------------------------------------------------------
create table public.soumissions (
  id                 uuid primary key default gen_random_uuid(),
  type               public.type_soumission not null,
  dataset_id         uuid references public.datasets (id) on delete set null,  -- pour une mise à jour
  soumis_par         uuid not null default auth.uid() references public.profils (id) on delete cascade,
  titre              jsonb not null check (titre ?| array['fr', 'en', 'ar']),
  description        jsonb,
  categorie_slug     text references public.categories (slug) on update cascade,
  licence_code       text references public.licences (code) on update cascade,
  source_nom         text check (char_length(source_nom) <= 200),
  source_url         text check (source_url is null or source_url ~* '^https?://[^\s]+$'),
  mots_cles          text[] not null default '{}',
  wilayas            text[] not null default '{}',
  periode_debut      date,
  periode_fin        date,
  message            text check (char_length(message) <= 2000),   -- mot pour les modérateurs
  statut             public.statut_soumission not null default 'en_attente',
  revue_par          uuid references public.profils (id) on delete set null,
  revue_le           timestamptz,
  dataset_publie_id  uuid references public.datasets (id) on delete set null,
  cree_le            timestamptz not null default now(),
  mis_a_jour_le      timestamptz not null default now(),
  check (type = 'nouvelle_donnee' or dataset_id is not null),
  check (periode_fin is null or periode_debut is null or periode_fin >= periode_debut)
);
create index soumissions_statut_idx on public.soumissions (statut, cree_le);
create index soumissions_auteur_idx on public.soumissions (soumis_par);

create trigger maj_horodatage_soumissions
  before update on public.soumissions
  for each row execute function public.maj_horodatage();

-- Fichiers joints à une proposition (stockés dans le bucket privé "soumissions")
create table public.soumission_fichiers (
  id               uuid primary key default gen_random_uuid(),
  soumission_id    uuid not null references public.soumissions (id) on delete cascade,
  chemin_stockage  text not null unique,           -- <id utilisateur>/<id soumission>/<fichier>
  nom_original     text not null check (char_length(nom_original) <= 255),
  taille_octets    bigint check (taille_octets >= 0),
  type_mime        text,
  cree_le          timestamptz not null default now()
);
create index soumission_fichiers_soumission_idx on public.soumission_fichiers (soumission_id);

-- Historique des décisions des modérateurs
create table public.revues (
  id             uuid primary key default gen_random_uuid(),
  soumission_id  uuid not null references public.soumissions (id) on delete cascade,
  relecteur_id   uuid references public.profils (id) on delete set null,
  decision       public.decision_revue not null,
  commentaire    text check (char_length(commentaire) <= 2000),
  cree_le        timestamptz not null default now()
);
create index revues_soumission_idx on public.revues (soumission_id, cree_le);


-- ---------------------------------------------------------------------
-- 3. Favoris, votes, commentaires
-- ---------------------------------------------------------------------
create table public.favoris (
  utilisateur_id  uuid not null default auth.uid() references public.profils (id) on delete cascade,
  dataset_id      uuid not null references public.datasets (id) on delete cascade,
  cree_le         timestamptz not null default now(),
  primary key (utilisateur_id, dataset_id)
);
create index favoris_dataset_idx on public.favoris (dataset_id);

create table public.votes (
  utilisateur_id  uuid not null default auth.uid() references public.profils (id) on delete cascade,
  dataset_id      uuid not null references public.datasets (id) on delete cascade,
  valeur          smallint not null check (valeur in (-1, 1)),
  cree_le         timestamptz not null default now(),
  mis_a_jour_le   timestamptz not null default now(),
  primary key (utilisateur_id, dataset_id)
);
create index votes_dataset_idx on public.votes (dataset_id);

create trigger maj_horodatage_votes
  before update on public.votes
  for each row execute function public.maj_horodatage();

create table public.commentaires (
  id            uuid primary key default gen_random_uuid(),
  dataset_id    uuid not null references public.datasets (id) on delete cascade,
  auteur_id     uuid default auth.uid() references public.profils (id) on delete set null,
  parent_id     uuid references public.commentaires (id) on delete set null,   -- réponse (1 niveau)
  contenu       text not null,
  supprime      boolean not null default false,   -- supprimé par son auteur
  masque        boolean not null default false,   -- masqué par un modérateur
  masque_par    uuid references public.profils (id) on delete set null,
  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz,
  check (supprime or char_length(btrim(contenu)) between 1 and 2000)
);
create index commentaires_dataset_idx on public.commentaires (dataset_id, cree_le);
create index commentaires_auteur_idx on public.commentaires (auteur_id, cree_le);


-- ---------------------------------------------------------------------
-- 4. Notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  utilisateur_id  uuid not null references public.profils (id) on delete cascade,
  type            text not null,     -- nouvelle_soumission, revue, publiee, reponse, nouvelle_version
  donnees         jsonb not null default '{}',
  lien            text,              -- chemin dans le site, ex. "/datasets/pharmacies"
  lue             boolean not null default false,
  cree_le         timestamptz not null default now()
);
create index notifications_utilisateur_idx on public.notifications (utilisateur_id, lue, cree_le desc);


-- ---------------------------------------------------------------------
-- 5. Triggers : compteurs, règles des commentaires, notifications
-- ---------------------------------------------------------------------

-- Compteurs de votes et score
create or replace function public.recalculer_votes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cible uuid := coalesce(new.dataset_id, old.dataset_id);
begin
  update public.datasets d set
    nb_votes_pour   = (select count(*) from public.votes v where v.dataset_id = cible and v.valeur = 1),
    nb_votes_contre = (select count(*) from public.votes v where v.dataset_id = cible and v.valeur = -1),
    score           = (select coalesce(sum(v.valeur), 0) from public.votes v where v.dataset_id = cible)
  where d.id = cible;
  return null;
end;
$$;
create trigger compteur_votes after insert or update or delete on public.votes
  for each row execute function public.recalculer_votes();

-- Compteur de favoris
create or replace function public.recalculer_favoris()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cible uuid := coalesce(new.dataset_id, old.dataset_id);
begin
  update public.datasets d
  set nb_favoris = (select count(*) from public.favoris f where f.dataset_id = cible)
  where d.id = cible;
  return null;
end;
$$;
create trigger compteur_favoris after insert or delete on public.favoris
  for each row execute function public.recalculer_favoris();

-- Compteur de commentaires (visibles uniquement)
create or replace function public.recalculer_commentaires()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cible uuid := coalesce(new.dataset_id, old.dataset_id);
begin
  update public.datasets d
  set nb_commentaires = (select count(*) from public.commentaires c
                         where c.dataset_id = cible and not c.supprime and not c.masque)
  where d.id = cible;
  return null;
end;
$$;
create trigger compteur_commentaires after insert or update or delete on public.commentaires
  for each row execute function public.recalculer_commentaires();

-- Règles des commentaires : réponse sur le même dataset, un seul niveau, anti-spam, édition
create or replace function public.verifier_commentaire()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  parent record;
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      select dataset_id, parent_id into parent from public.commentaires where id = new.parent_id;
      if not found or parent.dataset_id <> new.dataset_id then
        raise exception 'La réponse doit porter sur la même donnée que le commentaire d''origine' using errcode = '23514';
      end if;
      if parent.parent_id is not null then
        raise exception 'On ne peut répondre qu''à un commentaire principal' using errcode = '23514';
      end if;
    end if;
    if (select count(*) from public.commentaires
        where auteur_id = new.auteur_id and cree_le > now() - interval '10 minutes') >= 10 then
      raise exception 'Trop de commentaires en peu de temps, réessaie dans quelques minutes' using errcode = 'P0001';
    end if;
  else
    if new.supprime and not old.supprime then
      new.contenu := '';
    elsif new.contenu is distinct from old.contenu then
      new.modifie_le := now();
    end if;
  end if;
  return new;
end;
$$;
create trigger verifier_commentaire before insert or update on public.commentaires
  for each row execute function public.verifier_commentaire();

-- Notification : nouvelle proposition → modérateurs et admins
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
create trigger notifier_nouvelle_soumission after insert on public.soumissions
  for each row execute function public.notifier_nouvelle_soumission();

-- Notification : décision d'un modérateur → auteur de la proposition
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
create trigger notifier_revue after insert on public.revues
  for each row execute function public.notifier_revue();

-- Proposition publiée → notification, +50 de réputation, passage au rôle contributeur
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
create trigger recompenser_publication after update of statut on public.soumissions
  for each row execute function public.recompenser_publication();

-- Réponse à un commentaire → auteur du commentaire d'origine
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
create trigger notifier_reponse after insert on public.commentaires
  for each row execute function public.notifier_reponse();

-- Nouvelle version d'une donnée → membres qui l'ont en favori (watchlist)
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
create trigger notifier_nouvelle_version after update of version_courante_id on public.datasets
  for each row execute function public.notifier_nouvelle_version();


-- ---------------------------------------------------------------------
-- 6. Fonctions appelées par le site (rpc)
-- ---------------------------------------------------------------------

-- Modérateur : décider d'une proposition
create or replace function public.decider_soumission(
  soumission_id uuid,
  decision public.decision_revue,
  commentaire text default null
)
returns public.statut_soumission
language plpgsql security definer set search_path = '' as $$
declare
  s public.soumissions%rowtype;
  nouveau public.statut_soumission;
begin
  if not public.est_moderateur() then
    raise exception 'Réservé aux modérateurs' using errcode = '42501';
  end if;
  select * into s from public.soumissions where id = soumission_id for update;
  if not found then
    raise exception 'Proposition introuvable' using errcode = 'P0002';
  end if;
  if s.soumis_par = (select auth.uid()) and not public.est_admin() then
    raise exception 'Un modérateur ne peut pas valider sa propre proposition' using errcode = '42501';
  end if;
  if s.statut not in ('en_attente', 'modifications_demandees') then
    raise exception 'Cette proposition est déjà traitée (%)', s.statut using errcode = '22023';
  end if;
  if decision in ('modifications_demandees', 'refusee') and coalesce(btrim(commentaire), '') = '' then
    raise exception 'Un commentaire est obligatoire pour refuser ou demander des modifications' using errcode = '22023';
  end if;

  nouveau := case decision
    when 'commentaire'             then s.statut
    when 'modifications_demandees' then 'modifications_demandees'
    when 'acceptee'                then 'acceptee'
    when 'refusee'                 then 'refusee'
  end;

  insert into public.revues (soumission_id, relecteur_id, decision, commentaire)
  values (s.id, (select auth.uid()), decision, nullif(btrim(commentaire), ''));

  update public.soumissions
  set statut = nouveau,
      revue_par = case when decision = 'commentaire' then revue_par else (select auth.uid()) end,
      revue_le  = case when decision = 'commentaire' then revue_le  else now() end
  where id = s.id;

  return nouveau;
end;
$$;

-- Auteur : renvoyer sa proposition après avoir fait les modifications demandées
create or replace function public.renvoyer_soumission(soumission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.soumissions
  set statut = 'en_attente'
  where id = soumission_id and soumis_par = (select auth.uid()) and statut = 'modifications_demandees';
  if not found then
    raise exception 'Seule une proposition en « modifications demandées » peut être renvoyée par son auteur' using errcode = '42501';
  end if;
end;
$$;

-- Auteur : retirer sa proposition
create or replace function public.retirer_soumission(soumission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.soumissions
  set statut = 'retiree'
  where id = soumission_id and soumis_par = (select auth.uid()) and statut in ('en_attente', 'modifications_demandees');
  if not found then
    raise exception 'Seule une proposition en attente peut être retirée par son auteur' using errcode = '42501';
  end if;
end;
$$;

-- Modérateur : masquer ou réafficher un commentaire
create or replace function public.masquer_commentaire(commentaire_id uuid, masquer boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.est_moderateur() then
    raise exception 'Réservé aux modérateurs' using errcode = '42501';
  end if;
  update public.commentaires
  set masque = masquer,
      masque_par = case when masquer then (select auth.uid()) end
  where id = commentaire_id;
  if not found then
    raise exception 'Commentaire introuvable' using errcode = 'P0002';
  end if;
end;
$$;

-- Script de publication (clé service_role uniquement) : la proposition acceptée est en ligne
create or replace function public.marquer_soumission_publiee(soumission_id uuid, dataset_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.soumissions
  set statut = 'publiee', dataset_publie_id = marquer_soumission_publiee.dataset_id
  where id = soumission_id and statut = 'acceptee';
  if not found then
    raise exception 'Seule une proposition acceptée peut être marquée comme publiée' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.decider_soumission(uuid, public.decision_revue, text) from public, anon;
revoke execute on function public.renvoyer_soumission(uuid)                             from public, anon;
revoke execute on function public.retirer_soumission(uuid)                              from public, anon;
revoke execute on function public.masquer_commentaire(uuid, boolean)                    from public, anon;
revoke execute on function public.marquer_soumission_publiee(uuid, uuid)                from public, anon, authenticated;
grant  execute on function public.decider_soumission(uuid, public.decision_revue, text) to authenticated;
grant  execute on function public.renvoyer_soumission(uuid)                             to authenticated;
grant  execute on function public.retirer_soumission(uuid)                              to authenticated;
grant  execute on function public.masquer_commentaire(uuid, boolean)                    to authenticated;
grant  execute on function public.marquer_soumission_publiee(uuid, uuid)                to service_role;


-- ---------------------------------------------------------------------
-- 7. Droits (GRANT) : le projet n'expose pas les tables automatiquement
-- ---------------------------------------------------------------------
grant select on public.soumissions, public.soumission_fichiers, public.revues,
                public.favoris, public.votes, public.notifications to authenticated;
grant select on public.commentaires to anon, authenticated;

-- Propositions : l'auteur ne remplit que le contenu ; statut, revue et publication restent hors de portée
grant insert (type, dataset_id, titre, description, categorie_slug, licence_code, source_nom, source_url,
              mots_cles, wilayas, periode_debut, periode_fin, message) on public.soumissions to authenticated;
grant update (titre, description, categorie_slug, licence_code, source_nom, source_url,
              mots_cles, wilayas, periode_debut, periode_fin, message) on public.soumissions to authenticated;

grant insert (soumission_id, chemin_stockage, nom_original, taille_octets, type_mime) on public.soumission_fichiers to authenticated;
grant delete on public.soumission_fichiers to authenticated;

grant insert (dataset_id) on public.favoris to authenticated;
grant delete on public.favoris to authenticated;

grant insert (dataset_id, valeur) on public.votes to authenticated;
grant update (valeur) on public.votes to authenticated;
grant delete on public.votes to authenticated;

grant insert (dataset_id, parent_id, contenu) on public.commentaires to authenticated;
grant update (contenu, supprime) on public.commentaires to authenticated;

grant update (lue) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- Script de publication / synchro
grant select, insert, update, delete on public.soumissions, public.soumission_fichiers, public.revues,
  public.favoris, public.votes, public.commentaires, public.notifications to service_role;


-- ---------------------------------------------------------------------
-- 8. Règles RLS
-- ---------------------------------------------------------------------
alter table public.soumissions         enable row level security;
alter table public.soumission_fichiers enable row level security;
alter table public.revues              enable row level security;
alter table public.favoris             enable row level security;
alter table public.votes               enable row level security;
alter table public.commentaires        enable row level security;
alter table public.notifications       enable row level security;

-- Une donnée publiée (utilisé par plusieurs règles)
create or replace function public.dataset_publie(id_dataset uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.datasets where id = id_dataset and statut = 'publie');
$$;
grant execute on function public.dataset_publie(uuid) to anon, authenticated;

-- Nombre de propositions en cours de l'utilisateur connecté (limite anti-spam)
create or replace function public.nb_soumissions_en_cours()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.soumissions
  where soumis_par = (select auth.uid()) and statut in ('en_attente', 'modifications_demandees');
$$;
grant execute on function public.nb_soumissions_en_cours() to authenticated;

-- PROPOSITIONS
create policy "Propositions : l'auteur et les modérateurs les voient"
  on public.soumissions for select to authenticated
  using (soumis_par = (select auth.uid()) or public.est_moderateur());

create policy "Propositions : un membre propose (5 en attente max)"
  on public.soumissions for insert to authenticated
  with check (
    soumis_par = (select auth.uid())
    and statut = 'en_attente'
    and (
      (type = 'nouvelle_donnee' and dataset_id is null)
      or (
        type = 'mise_a_jour'
        and public.dataset_publie(dataset_id)
        -- les données synchronisées (GeoAlgeria) se corrigent chez leur source
        and not exists (
          select 1 from public.datasets d join public.sources src on src.id = d.source_id
          where d.id = dataset_id and src.type = 'synchronisee'
        )
      )
    )
    and public.nb_soumissions_en_cours() < 5
  );

create policy "Propositions : l'auteur modifie tant qu'elle n'est pas traitée"
  on public.soumissions for update to authenticated
  using (soumis_par = (select auth.uid()) and statut in ('en_attente', 'modifications_demandees'))
  with check (soumis_par = (select auth.uid()) and statut in ('en_attente', 'modifications_demandees'));

-- FICHIERS DES PROPOSITIONS
create policy "Fichiers proposés : l'auteur et les modérateurs les voient"
  on public.soumission_fichiers for select to authenticated
  using (
    public.est_moderateur()
    or exists (select 1 from public.soumissions s where s.id = soumission_id and s.soumis_par = (select auth.uid()))
  );

create policy "Fichiers proposés : l'auteur en ajoute"
  on public.soumission_fichiers for insert to authenticated
  with check (
    exists (select 1 from public.soumissions s
            where s.id = soumission_id and s.soumis_par = (select auth.uid())
              and s.statut in ('en_attente', 'modifications_demandees'))
    and chemin_stockage like (select auth.uid())::text || '/' || soumission_id::text || '/%'
  );

create policy "Fichiers proposés : l'auteur en retire"
  on public.soumission_fichiers for delete to authenticated
  using (
    exists (select 1 from public.soumissions s
            where s.id = soumission_id and s.soumis_par = (select auth.uid())
              and s.statut in ('en_attente', 'modifications_demandees'))
  );

-- REVUES (écrites uniquement par decider_soumission)
create policy "Revues : l'auteur et les modérateurs les voient"
  on public.revues for select to authenticated
  using (
    public.est_moderateur()
    or exists (select 1 from public.soumissions s where s.id = soumission_id and s.soumis_par = (select auth.uid()))
  );

-- FAVORIS (privés)
create policy "Favoris : chacun voit les siens"
  on public.favoris for select to authenticated using (utilisateur_id = (select auth.uid()));
create policy "Favoris : chacun ajoute les siens sur une donnée publiée"
  on public.favoris for insert to authenticated
  with check (utilisateur_id = (select auth.uid()) and public.dataset_publie(dataset_id));
create policy "Favoris : chacun retire les siens"
  on public.favoris for delete to authenticated using (utilisateur_id = (select auth.uid()));

-- VOTES (le détail est privé, seuls les totaux sur datasets sont publics)
create policy "Votes : chacun voit les siens"
  on public.votes for select to authenticated using (utilisateur_id = (select auth.uid()));
create policy "Votes : chacun vote sur une donnée publiée"
  on public.votes for insert to authenticated
  with check (utilisateur_id = (select auth.uid()) and public.dataset_publie(dataset_id));
create policy "Votes : chacun change son vote"
  on public.votes for update to authenticated
  using (utilisateur_id = (select auth.uid())) with check (utilisateur_id = (select auth.uid()));
create policy "Votes : chacun retire son vote"
  on public.votes for delete to authenticated using (utilisateur_id = (select auth.uid()));

-- COMMENTAIRES
create policy "Commentaires : visibles sur les données publiées"
  on public.commentaires for select to anon, authenticated
  using (
    public.est_moderateur()
    or (public.dataset_publie(dataset_id) and (not masque or auteur_id = (select auth.uid())))
  );
create policy "Commentaires : un membre commente une donnée publiée"
  on public.commentaires for insert to authenticated
  with check (auteur_id = (select auth.uid()) and public.dataset_publie(dataset_id) and not masque and not supprime);
create policy "Commentaires : l'auteur modifie ou supprime le sien"
  on public.commentaires for update to authenticated
  using (auteur_id = (select auth.uid()) and not supprime)
  with check (auteur_id = (select auth.uid()));

-- NOTIFICATIONS (écrites uniquement par les triggers)
create policy "Notifications : chacun voit les siennes"
  on public.notifications for select to authenticated using (utilisateur_id = (select auth.uid()));
create policy "Notifications : chacun marque les siennes comme lues"
  on public.notifications for update to authenticated
  using (utilisateur_id = (select auth.uid())) with check (utilisateur_id = (select auth.uid()));
create policy "Notifications : chacun supprime les siennes"
  on public.notifications for delete to authenticated using (utilisateur_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 9. Stockage privé des fichiers proposés
--    Chemin imposé : soumissions/<id utilisateur>/<id proposition>/<fichier>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('soumissions', 'soumissions', false, 52428800, array[
  'text/csv', 'text/plain', 'application/json', 'application/geo+json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
  'application/xml', 'text/xml', 'application/zip', 'application/pdf'
])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Soumissions : l'auteur et les modérateurs lisent"     on storage.objects;
drop policy if exists "Soumissions : l'auteur dépose"                         on storage.objects;
drop policy if exists "Soumissions : l'auteur supprime"                       on storage.objects;

create policy "Soumissions : l'auteur et les modérateurs lisent"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'soumissions'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.est_moderateur())
  );

create policy "Soumissions : l'auteur dépose"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'soumissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.soumissions s
      where s.id::text = (storage.foldername(name))[2]
        and s.soumis_par = (select auth.uid())
        and s.statut in ('en_attente', 'modifications_demandees')
    )
  );

create policy "Soumissions : l'auteur supprime"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'soumissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.soumissions s
      where s.id::text = (storage.foldername(name))[2]
        and s.soumis_par = (select auth.uid())
        and s.statut in ('en_attente', 'modifications_demandees')
    )
  );
