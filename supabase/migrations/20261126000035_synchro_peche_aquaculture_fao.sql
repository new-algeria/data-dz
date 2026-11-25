-- Synchronisation de la production de la pêche et de l'aquaculture de l'Algérie (FAO FishStat).
-- Source : FAO, Global fisheries and aquaculture production, fichier groupé GlobalProduction_<édition>.zip (CC BY 4.0, sans clé).
-- Le robot (dépôt de l'API, scripts/peche-aquaculture/) garde les lignes de l'Algérie depuis 1950 et publie la donnée
-- `peche-aquaculture-algerie` (production par filière, par espèce, espèces principales).
-- À appliquer dans Supabase SQL Editor AVANT de lancer la GitHub Action. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values (
  'CC-BY-4.0',
  'Creative Commons Attribution 4.0 International',
  'https://creativecommons.org/licenses/by/4.0/',
  true,
  true,
  false
)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'fao-fishstat',
  'FAO FishStat (Organisation des Nations unies pour l''alimentation et l''agriculture)',
  'https://www.fao.org/fishery/en/collection/global_production',
  'synchronisee',
  'Statistiques mondiales de la pêche et de l''aquaculture de la FAO : production annuelle par pays, espèce, zone de pêche et milieu d''élevage depuis 1950, en tonnes de poids vif. Licence CC BY 4.0, attribution à la FAO. Les années non déclarées par un pays sont estimées par la FAO (statut indiqué pour chaque valeur).'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'peche-aquaculture',
  'Pêche et aquaculture — FAO FishStat',
  (select id from public.sources where slug = 'fao-fishstat'),
  'interne',
  30,
  'Production annuelle de l''Algérie depuis 1950 : total, pêche en mer, pêche en eaux continentales, aquaculture marine, en eau saumâtre et en eau douce, et détail par espèce, avec la part officielle de chaque valeur (le reste est estimé par la FAO). La FAO publie une à deux éditions par an : une version n''est publiée que si les valeurs ont changé.'
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
left join public.licences as lic on lic.code = 'CC-BY-4.0'
where sync.code = 'peche-aquaculture';
