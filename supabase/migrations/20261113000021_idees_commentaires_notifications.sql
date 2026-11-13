-- Boîte à idées de New Algeria, suite (après 20261113000020_boite_idees.sql) :
--   1. commentaires sous les idées (un niveau de réponses, comme sur les fiches data-dz) ;
--   2. notifications : l'auteur est prévenu quand l'équipe change le statut de son idée, quand quelqu'un
--      commente son idée et quand on répond à son commentaire ; les deux premières partent aussi par email.
-- Les notifications des idées portent un lien vers New Algeria (« /ideas?idea=<id> ») : la cloche de data-dz
-- les ignore (types « idee_* »), celle de New Algeria les affiche.
-- Relançable.

-- ---------------------------------------------------------------------
-- 1. Commentaires
-- ---------------------------------------------------------------------
alter table public.idees add column if not exists nb_commentaires integer not null default 0;

create table if not exists public.idees_commentaires (
  id          uuid primary key default gen_random_uuid(),
  idee_id     uuid not null references public.idees (id) on delete cascade,
  -- Le compte supprimé, le commentaire reste (sans auteur) : les réponses gardent leur contexte.
  auteur_id   uuid default auth.uid() references public.profils (id) on delete set null,
  parent_id   uuid references public.idees_commentaires (id) on delete cascade,
  contenu     text not null check (char_length(contenu) <= 2000),
  supprime    boolean not null default false,
  masque      boolean not null default false,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz
);
create index if not exists idees_commentaires_idee_idx on public.idees_commentaires (idee_id, cree_le);
create index if not exists idees_commentaires_auteur_idx on public.idees_commentaires (auteur_id, cree_le desc);

-- Règles d'écriture : auteur imposé, un seul niveau de réponses, 10 commentaires en 10 minutes,
-- contenu vidé à la suppression.
create or replace function public.controler_commentaire_idee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent public.idees_commentaires%rowtype;
begin
  if tg_op = 'INSERT' then
    new.auteur_id := (select auth.uid());
    new.supprime := false;
    new.masque := false;
    new.modifie_le := null;
    new.contenu := btrim(new.contenu);
    if char_length(new.contenu) = 0 then
      raise exception 'Commentaire vide' using errcode = '23514';
    end if;
    if new.parent_id is not null then
      select * into parent from public.idees_commentaires where id = new.parent_id;
      if not found or parent.idee_id <> new.idee_id then
        raise exception 'Réponse à un commentaire introuvable' using errcode = '23503';
      end if;
      -- Répondre à une réponse revient à répondre au fil principal.
      if parent.parent_id is not null then
        new.parent_id := parent.parent_id;
      end if;
    end if;
    if (select count(*) from public.idees_commentaires
        where auteur_id = new.auteur_id and cree_le > now() - interval '10 minutes') >= 10 then
      raise exception 'Trop de commentaires en peu de temps, réessaie dans quelques minutes' using errcode = 'P0001';
    end if;
  else
    if new.supprime and not old.supprime then
      new.contenu := '';
    elsif new.contenu is distinct from old.contenu then
      new.contenu := btrim(new.contenu);
      if char_length(new.contenu) = 0 then
        raise exception 'Commentaire vide' using errcode = '23514';
      end if;
      new.modifie_le := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists controler_commentaire_idee on public.idees_commentaires;
create trigger controler_commentaire_idee
  before insert or update on public.idees_commentaires
  for each row execute function public.controler_commentaire_idee();

-- Compteur affiché sur la carte de l'idée : commentaires ni supprimés ni masqués.
create or replace function public.compter_commentaires_idee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible uuid := coalesce(new.idee_id, old.idee_id);
begin
  update public.idees
     set nb_commentaires = (select count(*) from public.idees_commentaires
                             where idee_id = cible and not supprime and not masque)
   where id = cible;
  return null;
end;
$$;

drop trigger if exists compter_commentaires_idee on public.idees_commentaires;
create trigger compter_commentaires_idee
  after insert or delete or update of supprime, masque on public.idees_commentaires
  for each row execute function public.compter_commentaires_idee();

-- Équipe : masquer ou réafficher un commentaire (il reste visible de son auteur et de l'équipe).
create or replace function public.masquer_commentaire_idee(p_commentaire_id uuid, p_masquer boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_moderateur() then
    raise exception 'Réservé à l''équipe de modération' using errcode = '42501';
  end if;
  update public.idees_commentaires set masque = p_masquer where id = p_commentaire_id;
end;
$$;

revoke execute on function public.masquer_commentaire_idee(uuid, boolean) from public, anon;
grant  execute on function public.masquer_commentaire_idee(uuid, boolean) to authenticated;
revoke execute on function public.controler_commentaire_idee()  from public, anon, authenticated;
revoke execute on function public.compter_commentaires_idee()   from public, anon, authenticated;

-- Droits : un membre écrit son texte, le corrige, le supprime (suppression douce).
revoke all on public.idees_commentaires from anon, authenticated;
grant select on public.idees_commentaires to anon, authenticated;
grant insert (idee_id, parent_id, contenu) on public.idees_commentaires to authenticated;
grant update (contenu, supprime) on public.idees_commentaires to authenticated;
grant select, insert, update, delete on public.idees_commentaires to service_role;

alter table public.idees_commentaires enable row level security;

-- La sous-requête sur idees applique sa propre RLS : les commentaires d'une idée masquée suivent l'idée.
drop policy if exists "Commentaires d'idées : visibles avec l'idée" on public.idees_commentaires;
create policy "Commentaires d'idées : visibles avec l'idée" on public.idees_commentaires
  for select using (
    exists (select 1 from public.idees i where i.id = idee_id)
    and (not masque or auteur_id = (select auth.uid()) or public.est_moderateur())
  );

drop policy if exists "Commentaires d'idées : un membre commente une idée visible" on public.idees_commentaires;
create policy "Commentaires d'idées : un membre commente une idée visible" on public.idees_commentaires
  for insert to authenticated
  with check (
    auteur_id = (select auth.uid())
    and exists (select 1 from public.idees i where i.id = idee_id and not i.masquee)
  );

drop policy if exists "Commentaires d'idées : l'auteur corrige ou supprime le sien" on public.idees_commentaires;
create policy "Commentaires d'idées : l'auteur corrige ou supprime le sien" on public.idees_commentaires
  for update to authenticated
  using (auteur_id = (select auth.uid()) and not supprime)
  with check (auteur_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 2. Notifications
-- ---------------------------------------------------------------------
-- Statut ou mot de l'équipe : changer_statut_idee (migration précédente) prévient désormais l'auteur.
create or replace function public.changer_statut_idee(p_idee_id uuid, p_statut text, p_reponse text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  avant public.idees%rowtype;
  reponse text := nullif(btrim(coalesce(p_reponse, '')), '');
begin
  if not public.est_moderateur() then
    raise exception 'Réservé à l''équipe de modération' using errcode = '42501';
  end if;
  if p_statut not in ('nouvelle', 'en_etude', 'retenue', 'en_cours', 'realisee', 'ecartee') then
    raise exception 'Statut inconnu' using errcode = '22023';
  end if;
  select * into avant from public.idees where id = p_idee_id for update;
  if not found then
    raise exception 'Idée introuvable' using errcode = 'P0002';
  end if;
  -- Le trigger controler_idee ne touche qu'au contenu : statut et réponse passent.
  update public.idees set statut = p_statut, reponse_equipe = reponse where id = p_idee_id;

  -- L'auteur est prévenu si quelque chose change pour lui (pas s'il s'agit de sa propre action).
  if avant.auteur_id is not null
     and avant.auteur_id <> (select auth.uid())
     and (avant.statut is distinct from p_statut or avant.reponse_equipe is distinct from reponse) then
    insert into public.notifications (utilisateur_id, type, donnees, lien)
    values (
      avant.auteur_id,
      'idee_statut',
      jsonb_build_object(
        'site', 'new-algeria',
        'idee_id', avant.id,
        'titre', jsonb_build_object('fr', avant.titre),
        'statut', p_statut,
        'ancien_statut', avant.statut,
        'reponse', reponse
      ),
      '/ideas?idea=' || avant.id
    );
  end if;
end;
$$;

revoke execute on function public.changer_statut_idee(uuid, text, text) from public, anon;
grant  execute on function public.changer_statut_idee(uuid, text, text) to authenticated;

-- Nouveau commentaire : l'auteur de l'idée est prévenu, et l'auteur du commentaire auquel on répond.
create or replace function public.notifier_commentaire_idee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  idee public.idees%rowtype;
  auteur_parent uuid;
  pseudo_auteur text;
  donnees jsonb;
begin
  select * into idee from public.idees where id = new.idee_id;
  select coalesce(nom_affiche, pseudo) into pseudo_auteur from public.profils where id = new.auteur_id;
  donnees := jsonb_build_object(
    'site', 'new-algeria',
    'idee_id', idee.id,
    'commentaire_id', new.id,
    'titre', jsonb_build_object('fr', idee.titre),
    'auteur', pseudo_auteur,
    'extrait', left(new.contenu, 280)
  );

  if new.parent_id is not null then
    select auteur_id into auteur_parent from public.idees_commentaires where id = new.parent_id;
    if auteur_parent is not null and auteur_parent <> new.auteur_id and auteur_parent is distinct from idee.auteur_id then
      insert into public.notifications (utilisateur_id, type, donnees, lien)
      values (auteur_parent, 'idee_reponse', donnees, '/ideas?idea=' || idee.id || '#comment-' || new.id);
    end if;
  end if;

  if idee.auteur_id is not null and idee.auteur_id <> new.auteur_id then
    insert into public.notifications (utilisateur_id, type, donnees, lien)
    values (idee.auteur_id, 'idee_commentaire', donnees, '/ideas?idea=' || idee.id || '#comment-' || new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.notifier_commentaire_idee() from public, anon, authenticated;

drop trigger if exists notifier_commentaire_idee on public.idees_commentaires;
create trigger notifier_commentaire_idee
  after insert on public.idees_commentaires
  for each row execute function public.notifier_commentaire_idee();

-- Emails : même fonction que pour data-dz (migrations 20261024000008 et 20261102000014), deux types de plus.
-- La fonction Edge envoyer-email construit ces emails aux couleurs de New Algeria (à redéployer).
create or replace function public.envoyer_email_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url_fonction text;
  secret text;
begin
  if new.type not in ('nouvelle_soumission', 'revue', 'publiee', 'role_attribue', 'idee_statut', 'idee_commentaire') then
    return null;
  end if;
  -- Commentaires : un email par idée et par heure au plus, tant que les précédents ne sont pas lus
  -- (la notification, elle, est toujours créée).
  if new.type = 'idee_commentaire' and exists (
    select 1 from public.notifications n
     where n.utilisateur_id = new.utilisateur_id
       and n.type = 'idee_commentaire'
       and n.id <> new.id
       and not n.lue
       and n.donnees->>'idee_id' = new.donnees->>'idee_id'
       and n.cree_le > now() - interval '1 hour'
  ) then
    return null;
  end if;
  select decrypted_secret into url_fonction from vault.decrypted_secrets where name = 'emails_url';
  select decrypted_secret into secret       from vault.decrypted_secrets where name = 'emails_secret';
  if url_fonction is null or secret is null then
    return null;  -- emails pas encore configurés
  end if;

  -- Appel asynchrone (pg_net) : envoyé après la validation de la transaction, sans la ralentir.
  perform net.http_post(
    url     := url_fonction,
    body    := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-emails-secret', secret)
  );
  return null;
exception when others then
  -- Un souci d'email ne doit jamais empêcher la notification (ni la proposition) d'être enregistrée.
  raise warning 'envoyer_email_notification : %', sqlerrm;
  return null;
end;
$$;

revoke execute on function public.envoyer_email_notification() from public, anon, authenticated;
