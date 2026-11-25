-- Synchronisation de la production agricole et du cheptel de l'Algérie (FAOSTAT, domaine QCL).
-- Source : FAO, FAOSTAT, fichier groupé « Africa » (sans clé), licence CC BY 4.0. La source `fao` existe déjà :
-- elle n'est créée que si elle manque, et son type n'est pas modifié.
-- Le robot (dépôt de l'API, scripts/agriculture/) publie la donnée `production-agricole-algerie`.
-- À appliquer dans Supabase SQL Editor AVANT de lancer la GitHub Action. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values ('CC-BY-4.0', 'Creative Commons Attribution 4.0 International', 'https://creativecommons.org/licenses/by/4.0/', true, true, false)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'fao',
  'FAO (FAOSTAT)',
  'https://www.fao.org/faostat/',
  'officielle',
  'Base statistique de l''Organisation des Nations unies pour l''alimentation et l''agriculture : production agricole, élevage, commerce et alimentation par pays depuis 1961. Licence CC BY 4.0.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'agriculture-fao',
  'Production agricole et élevage — FAOSTAT',
  (select id from public.sources where slug = 'fao'),
  'interne',
  30,
  'Production des cultures et de l''élevage, surfaces, rendements et cheptel de l''Algérie depuis 1961 (148 produits, 30 séries principales), avec le statut de chaque valeur : officielle, ou estimée par la FAO quand l''Algérie ne l''a pas transmise. Une version n''est publiée que si FAOSTAT a ajouté ou révisé des valeurs.'
)
on conflict (code) do nothing;

-- Vérification : la source, la licence et la synchronisation doivent être présentes.
select
  sync.code,
  sync.nom,
  src.slug as source_slug,
  lic.code as licence_code,
  sync.mode,
  sync.intervalle_jours
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'CC-BY-4.0'
where sync.code = 'agriculture-fao';
