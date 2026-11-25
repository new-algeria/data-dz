-- Synchronisation hebdomadaire des températures par wilaya (NASA POWER).
-- Source : NASA Langley Research Center, POWER Project, API « daily point » (réanalyse MERRA-2 / GEOS-IT), sans clé.
-- Le robot (dépôt de l'API, scripts/temperatures/) interroge un point par wilaya, au chef-lieu, depuis 1981, et publie
-- la donnée `temperatures-wilayas` (synthèses annuelles, mensuelles, nationales et séries quotidiennes en CSV).
-- À appliquer dans Supabase SQL Editor AVANT de lancer la GitHub Action. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values (
  'CC0-1.0',
  'Creative Commons Zero 1.0 (domaine public)',
  'https://creativecommons.org/publicdomain/zero/1.0/',
  true,
  false,
  false
)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'nasa-power',
  'NASA POWER (Prediction Of Worldwide Energy Resources)',
  'https://power.larc.nasa.gov/',
  'synchronisee',
  'Service de la NASA (Langley Research Center) qui fournit des séries météorologiques et solaires quotidiennes depuis 1981 pour tout point du globe, issues de la réanalyse MERRA-2 puis de GEOS-IT pour les jours récents. Données ouvertes, sans clé ni restriction de réutilisation ; la NASA demande d''être citée. Valeurs estimées sur une maille d''environ 50 km : ce ne sont pas des relevés de stations.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'temperatures',
  'Températures par wilaya — NASA POWER',
  (select id from public.sources where slug = 'nasa-power'),
  'interne',
  7,
  'Températures quotidiennes (maximale, minimale, moyenne à 2 m) au chef-lieu des 69 wilayas depuis 1981 : bureau de poste principal de la commune chef-lieu (donnée « Divisions administratives »), sinon médiane des bureaux de la commune. Synthèses mensuelles et annuelles (jours à 35 et 40 °C ou plus, nuits à 20 °C ou plus, records, écart à la normale 1991–2020) et synthèse nationale. Estimations de réanalyse, pas des relevés. Une version n''est publiée que si un mois complet s''est ajouté ou si la NASA a révisé les valeurs.'
)
on conflict (code) do nothing;

-- Vérification : la source, la licence et la synchronisation doivent être présentes.
select
  sync.code,
  sync.nom,
  src.slug as source_slug,
  src.url as source_url,
  lic.code as licence_code,
  sync.mode,
  sync.intervalle_jours
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'CC0-1.0'
where sync.code = 'temperatures';
