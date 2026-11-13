-- Boîte à idées de New Algeria (newalgeria.org/ideas), dans le même projet Supabase que data-dz.
-- Un membre propose une idée pour l'Algérie (titre, description, catégorie), les membres votent,
-- l'équipe (modérateurs, admins) fait avancer son statut et peut y répondre.
-- Relançable : tables « if not exists », fonctions « or replace », règles recréées.

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.idees (
  id              uuid primary key default gen_random_uuid(),
  -- Le compte supprimé, l'idée reste (sans auteur) : les votes des autres ne disparaissent pas.
  auteur_id       uuid default auth.uid() references public.profils (id) on delete set null,
  titre           text not null check (char_length(btrim(titre)) between 5 and 120),
  description     text not null default '' check (char_length(description) <= 1000),
  categorie       text not null default 'autre'
                  check (categorie in ('sante', 'education', 'transport', 'economie', 'environnement',
                                       'administration', 'culture', 'numerique', 'autre')),
  statut          text not null default 'nouvelle'
                  check (statut in ('nouvelle', 'en_etude', 'retenue', 'en_cours', 'realisee', 'ecartee')),
  -- Mot de l'équipe affiché sous l'idée (pourquoi elle est retenue, écartée, où elle en est).
  reponse_equipe  text check (char_length(reponse_equipe) <= 1000),
  masquee         boolean not null default false,
  nb_votes        integer not null default 0,
  cree_le         timestamptz not null default now(),
  mis_a_jour_le   timestamptz not null default now()
);
create index if not exists idees_votes_idx on public.idees (nb_votes desc, cree_le desc);
create index if not exists idees_auteur_idx on public.idees (auteur_id);

create table if not exists public.idees_votes (
  utilisateur_id  uuid not null default auth.uid() references public.profils (id) on delete cascade,
  idee_id         uuid not null references public.idees (id) on delete cascade,
  cree_le         timestamptz not null default now(),
  primary key (utilisateur_id, idee_id)
);
create index if not exists idees_votes_idee_idx on public.idees_votes (idee_id);


-- ---------------------------------------------------------------------
-- 2. Triggers
-- ---------------------------------------------------------------------
-- Avant insertion ou modification par un membre : contenu nettoyé, rien d'autre ne bouge,
-- 5 idées par 24 h au plus.
create or replace function public.controler_idee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.titre := btrim(new.titre);
  new.description := btrim(coalesce(new.description, ''));
  if tg_op = 'INSERT' then
    new.auteur_id := (select auth.uid());
    new.statut := 'nouvelle';
    new.reponse_equipe := null;
    new.masquee := false;
    new.nb_votes := 0;
    if (select count(*) from public.idees
        where auteur_id = new.auteur_id and cree_le > now() - interval '24 hours') >= 5 then
      raise exception 'Trop d''idées en peu de temps, réessaie demain' using errcode = 'P0001';
    end if;
  end if;
  new.mis_a_jour_le := now();
  return new;
end;
$$;

drop trigger if exists controler_idee on public.idees;
create trigger controler_idee
  before insert or update on public.idees
  for each row execute function public.controler_idee();

-- Compteur de votes recalculé par la base (le site ne l'écrit jamais).
create or replace function public.compter_votes_idee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible uuid := coalesce(new.idee_id, old.idee_id);
begin
  update public.idees
     set nb_votes = (select count(*) from public.idees_votes where idee_id = cible)
   where id = cible;
  return null;
end;
$$;

drop trigger if exists compter_votes_idee on public.idees_votes;
create trigger compter_votes_idee
  after insert or delete on public.idees_votes
  for each row execute function public.compter_votes_idee();


-- ---------------------------------------------------------------------
-- 3. Actions de l'équipe (modérateurs et admins)
-- ---------------------------------------------------------------------
create or replace function public.changer_statut_idee(p_idee_id uuid, p_statut text, p_reponse text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_moderateur() then
    raise exception 'Réservé à l''équipe de modération' using errcode = '42501';
  end if;
  if p_statut not in ('nouvelle', 'en_etude', 'retenue', 'en_cours', 'realisee', 'ecartee') then
    raise exception 'Statut inconnu' using errcode = '22023';
  end if;
  -- Le trigger controler_idee ne touche qu'au contenu : statut et réponse passent.
  update public.idees
     set statut = p_statut,
         reponse_equipe = nullif(btrim(coalesce(p_reponse, '')), '')
   where id = p_idee_id;
  if not found then
    raise exception 'Idée introuvable' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.masquer_idee(p_idee_id uuid, p_masquer boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_moderateur() then
    raise exception 'Réservé à l''équipe de modération' using errcode = '42501';
  end if;
  update public.idees set masquee = p_masquer where id = p_idee_id;
end;
$$;

revoke execute on function public.changer_statut_idee(uuid, text, text) from public, anon;
revoke execute on function public.masquer_idee(uuid, boolean)          from public, anon;
grant  execute on function public.changer_statut_idee(uuid, text, text) to authenticated;
grant  execute on function public.masquer_idee(uuid, boolean)          to authenticated;
revoke execute on function public.controler_idee()      from public, anon, authenticated;
revoke execute on function public.compter_votes_idee()  from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Droits : un membre n'écrit que le contenu de ses idées et ses votes
-- ---------------------------------------------------------------------
revoke all on public.idees, public.idees_votes from anon, authenticated;
grant select on public.idees to anon, authenticated;
grant insert (titre, description, categorie) on public.idees to authenticated;
grant update (titre, description, categorie) on public.idees to authenticated;
grant delete on public.idees to authenticated;

grant select on public.idees_votes to authenticated;
grant insert (idee_id) on public.idees_votes to authenticated;
grant delete on public.idees_votes to authenticated;

grant select, insert, update, delete on public.idees, public.idees_votes to service_role;


-- ---------------------------------------------------------------------
-- 5. Règles RLS
-- ---------------------------------------------------------------------
alter table public.idees       enable row level security;
alter table public.idees_votes enable row level security;

drop policy if exists "Idées : visibles de tous, masquées pour l'auteur et l'équipe" on public.idees;
create policy "Idées : visibles de tous, masquées pour l'auteur et l'équipe" on public.idees
  for select using (not masquee or auteur_id = (select auth.uid()) or public.est_moderateur());

drop policy if exists "Idées : un membre propose" on public.idees;
create policy "Idées : un membre propose" on public.idees
  for insert to authenticated with check (auteur_id = (select auth.uid()));

drop policy if exists "Idées : l'auteur modifie tant qu'elle est nouvelle" on public.idees;
create policy "Idées : l'auteur modifie tant qu'elle est nouvelle" on public.idees
  for update to authenticated
  using (auteur_id = (select auth.uid()) and statut = 'nouvelle')
  with check (auteur_id = (select auth.uid()) and statut = 'nouvelle');

drop policy if exists "Idées : l'auteur (si nouvelle) ou l'équipe la retire" on public.idees;
create policy "Idées : l'auteur (si nouvelle) ou l'équipe la retire" on public.idees
  for delete to authenticated
  using ((auteur_id = (select auth.uid()) and statut = 'nouvelle') or public.est_moderateur());

drop policy if exists "Votes d'idées : chacun voit les siens" on public.idees_votes;
create policy "Votes d'idées : chacun voit les siens" on public.idees_votes
  for select to authenticated using (utilisateur_id = (select auth.uid()));

drop policy if exists "Votes d'idées : chacun vote pour une idée visible" on public.idees_votes;
create policy "Votes d'idées : chacun vote pour une idée visible" on public.idees_votes
  for insert to authenticated
  with check (
    utilisateur_id = (select auth.uid())
    and exists (select 1 from public.idees i where i.id = idee_id and not i.masquee)
  );

drop policy if exists "Votes d'idées : chacun retire le sien" on public.idees_votes;
create policy "Votes d'idées : chacun retire le sien" on public.idees_votes
  for delete to authenticated using (utilisateur_id = (select auth.uid()));
