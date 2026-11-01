-- Envoie une notification et un email uniquement lorsqu'un rôle privilégié est attribué.
-- Les rétrogradations et retraits de rôle ne créent pas de notification.
create or replace function public.notifier_role_attribue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  libelle_role jsonb;
begin
  if new.role::text not in ('contributeur', 'moderateur', 'admin') then
    return new;
  end if;

  libelle_role := case new.role::text
    when 'contributeur' then jsonb_build_object('fr', 'Contributeur', 'en', 'Contributor', 'ar', 'مساهم')
    when 'moderateur' then jsonb_build_object('fr', 'Modérateur', 'en', 'Moderator', 'ar', 'مشرف')
    when 'admin' then jsonb_build_object('fr', 'Administrateur', 'en', 'Administrator', 'ar', 'مدير')
  end;

  insert into public.notifications (utilisateur_id, type, donnees, lien)
  values (
    new.id,
    'role_attribue',
    jsonb_build_object('role', libelle_role),
    '/profile'
  );
  return new;
end;
$$;

revoke execute on function public.notifier_role_attribue() from public, anon, authenticated;

drop trigger if exists notifier_role_attribue on public.profils;
create trigger notifier_role_attribue
  after update of role on public.profils
  for each row
  when (old.role is distinct from new.role)
  execute function public.notifier_role_attribue();

-- Les emails de rôles utilisent le même endpoint sécurisé et asynchrone que les autres notifications.
create or replace function public.envoyer_email_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url_fonction text;
  secret text;
begin
  if new.type not in ('nouvelle_soumission', 'revue', 'publiee', 'role_attribue') then
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

drop trigger if exists envoyer_email_notification on public.notifications;
create trigger envoyer_email_notification after insert on public.notifications
  for each row execute function public.envoyer_email_notification();
