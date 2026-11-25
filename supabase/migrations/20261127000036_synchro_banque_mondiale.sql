-- Synchronisation mensuelle des indicateurs de développement de l'Algérie (Banque mondiale, WDI).
-- Source : API v2 de la Banque mondiale (sans clé), licence CC BY 4.0. La source `banque-mondiale` existe déjà :
-- elle n'est créée que si elle manque, et son type n'est pas modifié.
-- Le robot (dépôt de l'API, scripts/banque-mondiale/) publie la donnée `indicateurs-developpement-algerie`.
-- À appliquer dans Supabase SQL Editor AVANT de lancer la GitHub Action. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values ('CC-BY-4.0', 'Creative Commons Attribution 4.0 International', 'https://creativecommons.org/licenses/by/4.0/', true, true, false)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'banque-mondiale',
  'Banque mondiale',
  'https://data.worldbank.org/country/algeria',
  'officielle',
  'Indicateurs du développement dans le monde (WDI) de la Banque mondiale : séries annuelles par pays depuis 1960. Licence CC BY 4.0.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'banque-mondiale',
  'Indicateurs de développement — Banque mondiale',
  (select id from public.sources where slug = 'banque-mondiale'),
  'interne',
  30,
  '36 indicateurs annuels de la Banque mondiale sur l''Algérie depuis 1960 : population, santé, éducation, économie, emploi, numérique et environnement. Valeurs absentes laissées vides ; estimations modélisées (chômage OIT…) signalées. Une version n''est publiée que si la Banque mondiale a ajouté ou révisé des valeurs.'
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
where sync.code = 'banque-mondiale';
