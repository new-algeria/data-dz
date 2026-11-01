-- Quota DjazAI : 5 questions par compte et par jour civil en heure d'Alger.
-- Seule l'API, avec la clé Supabase secrète, peut lire/incrémenter ce compteur.
create table if not exists public.djazai_quotas_journaliers (
  utilisateur_id uuid not null references auth.users(id) on delete cascade,
  jour_algerie date not null,
  questions integer not null default 0 check (questions between 0 and 5),
  primary key (utilisateur_id, jour_algerie)
);

comment on table public.djazai_quotas_journaliers is
  'Compteur journalier de questions DjazAI par compte, remis à zéro au changement de jour en Africa/Algiers.';

alter table public.djazai_quotas_journaliers enable row level security;
revoke all on table public.djazai_quotas_journaliers from public, anon, authenticated;
grant all on table public.djazai_quotas_journaliers to service_role;

create or replace function public.compter_quota_djazai(
  p_utilisateur_id uuid,
  p_consommer boolean default false
)
returns table (
  autorise boolean,
  limite integer,
  restantes integer,
  reinitialisation timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_jour date := (statement_timestamp() at time zone 'Africa/Algiers')::date;
  v_questions integer;
begin
  if p_utilisateur_id is null then
    raise exception 'utilisateur_id requis' using errcode = '22023';
  end if;

  if p_consommer then
    insert into public.djazai_quotas_journaliers as quota (utilisateur_id, jour_algerie, questions)
    values (p_utilisateur_id, v_jour, 1)
    on conflict (utilisateur_id, jour_algerie)
    do update set questions = quota.questions + 1
    where quota.questions < 5
    returning quota.questions into v_questions;

    if not found then
      select quota.questions
      into v_questions
      from public.djazai_quotas_journaliers as quota
      where quota.utilisateur_id = p_utilisateur_id
        and quota.jour_algerie = v_jour;
    end if;
  else
    select quota.questions
    into v_questions
    from public.djazai_quotas_journaliers as quota
    where quota.utilisateur_id = p_utilisateur_id
      and quota.jour_algerie = v_jour;
    v_questions := coalesce(v_questions, 0);
  end if;

  return query
  select
    case when p_consommer then v_questions < 5 or v_questions <= 5 and v_questions > 0 else v_questions < 5 end,
    5,
    greatest(0, 5 - v_questions),
    (v_jour + 1)::timestamp at time zone 'Africa/Algiers';
end;
$$;

revoke all on function public.compter_quota_djazai(uuid, boolean) from public, anon, authenticated;
grant execute on function public.compter_quota_djazai(uuid, boolean) to service_role;
