-- Compteurs publics des consultations de fiches et des téléchargements.
alter table public.datasets
  add column if not exists nb_vues bigint not null default 0,
  add column if not exists nb_telechargements bigint not null default 0;

comment on column public.datasets.nb_vues is
  'Nombre de consultations de la fiche comptées par le site (au plus une par onglet et jeu de données).';
comment on column public.datasets.nb_telechargements is
  'Nombre de redirections de téléchargement réussies; les accès inline d''aperçu sont exclus.';

create or replace function public.compter_evenement_donnee(p_slug text, p_evenement text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  compteur bigint;
begin
  if p_evenement = 'vue' then
    update public.datasets
    set nb_vues = nb_vues + 1
    where slug = p_slug and statut = 'publie'
    returning nb_vues into compteur;
  elsif p_evenement = 'telechargement' then
    update public.datasets
    set nb_telechargements = nb_telechargements + 1
    where slug = p_slug and statut = 'publie'
    returning nb_telechargements into compteur;
  else
    raise exception 'Type de compteur inconnu' using errcode = '22023';
  end if;

  if compteur is null then
    raise exception 'Jeu de données introuvable ou non publié' using errcode = 'P0002';
  end if;

  return compteur;
end;
$$;

revoke all on function public.compter_evenement_donnee(text, text) from public, anon, authenticated;
grant execute on function public.compter_evenement_donnee(text, text) to service_role;
