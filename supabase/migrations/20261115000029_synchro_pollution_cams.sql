-- Synchronisation semestrielle de la pollution atmosphérique depuis CAMS EAC4.
-- La donnée est une réanalyse modélisée de fond régional, pas une mesure de station ni un AQI.

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

insert into public.categories (slug, nom, icone, ordre)
values (
  'environnement',
  '{"fr":"Environnement","en":"Environment","ar":"البيئة"}'::jsonb,
  'leaf',
  150
)
on conflict (slug) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'copernicus-cams-eac4',
  'Copernicus Atmosphere Monitoring Service (CAMS EAC4)',
  'https://ads.atmosphere.copernicus.eu/datasets/cams-global-reanalysis-eac4-monthly',
  'synchronisee',
  'CAMS global reanalysis (EAC4) monthly averaged fields, DOI 10.24381/fd75fff2, licence CC BY 4.0. Moyennes mensuelles des particules PM2.5/PM10 et des gaz CO, NO2, O3, SO2. Grille globale 0,75° (~80 km), couverture publiée 2003–2025, mise à jour deux fois par an avec 4 à 6 mois de délai. Réanalyse modélisée de fond régional, pas mesure de station ni indice AQI.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'pollution-atmospherique',
  'Pollution atmosphérique en Algérie — CAMS EAC4',
  (select id from public.sources where slug = 'copernicus-cams-eac4'),
  'interne',
  180,
  'Séries mensuelles 2003–2025 CAMS EAC4 : PM2.5, PM10, CO, NO2, O3 et SO2. Concentrations PM en µg/m³ ; gaz en ppbv après conversion du rapport massique. Grille 0,75° (~80 km), mailles retenues par les contours GeoAlgeria ; moyennes nationales pondérées par cos(latitude), sans valeurs par wilaya. Réanalyse modélisée de fond régional, pas mesures de station, AQI réglementaire ou alerte sanitaire. Mise à jour semestrielle selon la publication ADS.'
)
on conflict (code) do nothing;

select
  sync.code,
  sync.nom,
  src.slug as source_slug,
  src.url as source_url,
  lic.code as licence_code,
  lic.url as licence_url,
  sync.intervalle_jours,
  sync.description
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'CC-BY-4.0'
where sync.code = 'pollution-atmospherique';
