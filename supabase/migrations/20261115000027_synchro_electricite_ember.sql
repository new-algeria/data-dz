-- Synchronisation bimensuelle des séries annuelles d'électricité Ember pour l'Algérie.
-- Source : Ember Yearly Electricity Data, fichier CSV global, licence CC BY 4.0.
-- Le robot filtre le code pays DZA et publie des séries annuelles nationales (pas de ventilation par wilaya).
-- À appliquer dans Supabase SQL Editor après 20261115000026. Réexécutable sans doublons.

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
  'ember-electricity',
  'Ember — Yearly Electricity Data',
  'https://ember-energy.org/data/yearly-electricity-data/',
  'synchronisee',
  'Fichier CSV mondial des séries annuelles de production, capacité, émissions, demande et importations nettes d''électricité pour plus de 200 territoires. Data-DZ conserve les lignes de l''Algérie (ISO DZA). Ember actualise le fichier environ deux fois par mois ; la couverture annuelle la plus récente varie selon les pays. Licence CC BY 4.0, attribution à Ember.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'electricite',
  'Électricité en Algérie — Ember',
  (select id from public.sources where slug = 'ember-electricity'),
  'interne',
  15,
  'Extraction du fichier mondial Ember Yearly Electricity Data pour le code ISO DZA : production totale et par filière, demande, importations nettes, capacité installée, émissions et intensité, en séries annuelles nationales. Licence CC BY 4.0. Le fichier est mis à jour environ deux fois par mois ; la période réellement disponible pour l''Algérie est détectée, sans extrapolation. Les agrégats sont signalés et ne doivent pas être additionnés aux filières détaillées.'
)
on conflict (code) do nothing;

-- Vérification : la source, la licence et la synchronisation doivent être présentes.
select
  sync.code,
  sync.nom,
  src.slug as source_slug,
  src.url as source_url,
  lic.code as licence_code,
  lic.url as licence_url,
  sync.mode,
  sync.intervalle_jours,
  sync.description
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'CC-BY-4.0'
where sync.code = 'electricite';
