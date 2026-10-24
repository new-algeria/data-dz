-- =====================================================================
-- data-dz · Bloc 8 : revue enrichie et emails de notification
-- À coller dans Supabase → SQL Editor → New query → Run (après le bloc 7)
--
--   1. Les modérateurs et admins peuvent compléter ou corriger une proposition en cours de revue
--      (mêmes champs de contenu que l'auteur) et en gérer les fichiers.
--   2. Chaque modification est tracée dans l'historique (revue « modification ») : l'auteur est notifié.
--   3. Chaque nouvelle notification « nouvelle_soumission », « revue » ou « publiee » déclenche l'envoi
--      d'un email par la fonction Edge « envoyer-email ». L'URL et le secret partagé sont lus dans
--      Supabase Vault (jamais dans ce dépôt) : sans eux, aucun email n'est envoyé et rien ne casse.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nouvelle décision de l'historique : « modification » (le statut ne change pas)
-- ---------------------------------------------------------------------
alter type public.decision_revue add value if not exists 'modification';


-- ---------------------------------------------------------------------
-- 2. Les modérateurs modifient le contenu d'une proposition en cours
--    Les droits de colonnes (GRANT du bloc 5) restent les mêmes : statut, auteur et revue
--    ne s'écrivent jamais directement.
-- ---------------------------------------------------------------------
drop policy if exists "Propositions : les modérateurs complètent" on public.soumissions;
create policy "Propositions : les modérateurs complètent"
  on public.soumissions for update to authenticated
  using (public.est_moderateur() and statut in ('en_attente', 'modifications_demandees'))
  with check (public.est_moderateur() and statut in ('en_attente', 'modifications_demandees'));

-- Fichiers : rangés dans le dossier de l'auteur (<id auteur>/<id proposition>/…), comme les siens
drop policy if exists "Fichiers proposés : les modérateurs en ajoutent" on public.soumission_fichiers;
create policy "Fichiers proposés : les modérateurs en ajoutent"
  on public.soumission_fichiers for insert to authenticated
  with check (
    public.est_moderateur()
    and exists (select 1 from public.soumissions s
                where s.id = soumission_id
                  and s.statut in ('en_attente', 'modifications_demandees')
                  and chemin_stockage like s.soumis_par::text || '/' || s.id::text || '/%')
  );

drop policy if exists "Fichiers proposés : les modérateurs en retirent" on public.soumission_fichiers;
create policy "Fichiers proposés : les modérateurs en retirent"
  on public.soumission_fichiers for delete to authenticated
  using (
    public.est_moderateur()
    and exists (select 1 from public.soumissions s
                where s.id = soumission_id and s.statut in ('en_attente', 'modifications_demandees'))
  );

drop policy if exists "Soumissions : les modérateurs déposent" on storage.objects;
create policy "Soumissions : les modérateurs déposent"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'soumissions'
    and public.est_moderateur()
    and exists (
      select 1 from public.soumissions s
      where s.id::text = (storage.foldername(name))[2]
        and s.soumis_par::text = (storage.foldername(name))[1]
        and s.statut in ('en_attente', 'modifications_demandees')
    )
  );

drop policy if exists "Soumissions : les modérateurs suppriment" on storage.objects;
create policy "Soumissions : les modérateurs suppriment"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'soumissions'
    and public.est_moderateur()
    and exists (
      select 1 from public.soumissions s
      where s.id::text = (storage.foldername(name))[2]
        and s.soumis_par::text = (storage.foldername(name))[1]
        and s.statut in ('en_attente', 'modifications_demandees')
    )
  );


-- ---------------------------------------------------------------------
-- 3. Trace d'une modification faite par un modérateur
--    Ajoute une revue « modification » ; le trigger notifier_revue prévient l'auteur.
-- ---------------------------------------------------------------------
create or replace function public.noter_modification(soumission_id uuid, details text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.soumissions%rowtype;
begin
  if not public.est_moderateur() then
    raise exception 'Réservé aux modérateurs' using errcode = '42501';
  end if;
  select * into s from public.soumissions where id = soumission_id;
  if not found then
    raise exception 'Proposition introuvable' using errcode = 'P0002';
  end if;
  if s.statut not in ('en_attente', 'modifications_demandees') then
    raise exception 'Cette proposition est déjà traitée (%)', s.statut using errcode = '22023';
  end if;
  if coalesce(btrim(details), '') = '' or char_length(details) > 2000 then
    raise exception 'Le détail de la modification est obligatoire (2000 caractères maximum)' using errcode = '22023';
  end if;

  insert into public.revues (soumission_id, relecteur_id, decision, commentaire)
  values (s.id, (select auth.uid()), 'modification', btrim(details));
end;
$$;

revoke execute on function public.noter_modification(uuid, text) from public, anon;
grant  execute on function public.noter_modification(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Emails : chaque notification utile est envoyée à la fonction Edge « envoyer-email »
--    Configuration (une seule fois, dans le SQL Editor, jamais commitée) :
--      select vault.create_secret('https://<projet>.supabase.co/functions/v1/envoyer-email', 'emails_url');
--      select vault.create_secret('<secret long et aléatoire>', 'emails_secret');
--    Le même secret est donné à la fonction : supabase secrets set EMAILS_SECRET=<secret>
-- ---------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.envoyer_email_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url_fonction text;
  secret text;
begin
  if new.type not in ('nouvelle_soumission', 'revue', 'publiee') then
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
