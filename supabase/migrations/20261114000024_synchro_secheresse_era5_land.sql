-- Synchronisation mensuelle « Sécheresse, précipitations et humidité des sols ».
-- Source climatique : Copernicus C3S / ERA5-Land (CC BY 4.0).
-- Le calcul est dans api-dz-backend/scripts/secheresse/ et le workflow secheresse-sync.yml.
-- L'agrégation utilise les contours GeoAlgeria des 69 wilayas (ODbL-1.0), sans redistribuer les géométries.
-- À exécuter dans Supabase SQL Editor après 20261102000017. Réexécutable sans doublons.

-- Licence requise par les fichiers de réanalyse Copernicus.
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

-- Catégorie publique de classement (aucun effet si elle existe déjà).
insert into public.categories (slug, nom, icone, ordre)
values (
  'environnement',
  '{"fr":"Environnement","en":"Environment","ar":"البيئة"}'::jsonb,
  'leaf',
  150
)
on conflict (slug) do nothing;

-- Source climatique.
insert into public.sources (slug, nom, url, type, description)
values (
  'copernicus-era5-land',
  'Copernicus Climate Change Service (ERA5-Land)',
  'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means',
  'synchronisee',
  'Réanalyse mensuelle ERA5-Land du Copernicus Climate Change Service (C3S), grille régulière 0,1° (~9 km), DOI 10.24381/cds.68d2bb30, licence CC BY 4.0. Actualisée chaque mois ; le pipeline retient le dernier mois civil complet disponible. Les précipitations de septembre 2022 à février 2024 sont corrigées à partir du produit mensuel par heure de la journée à 00:00, conformément à la documentation ECMWF.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'secheresse',
  'Sécheresse, précipitations et humidité des sols',
  (select id from public.sources where slug = 'copernicus-era5-land'),
  'interne',
  30,
  'Indicateurs mensuels ERA5-Land depuis janvier 1981 : précipitations, normales et anomalies, SPI-3/SPI-12, humidité du sol (0–7, 7–28, 28–100 et 100–289 cm), percentile saisonnier d’humidité et température moyenne. Moyennes pondérées par surface sur les 69 wilayas GeoAlgeria. Référence 1991–2020. Le pipeline reprend les précipitations de 09/2022 à 02/2024 du produit ERA5-Land monthly_averaged_reanalysis_by_hour_of_day à 00:00 afin d’éviter le défaut documenté du produit mensuel standard. Réanalyse modélisée, pas mesures de station ; période limitée au dernier mois complet disponible.'
)
on conflict (code) do nothing;

-- Vérification : source, licence et synchronisation doivent toutes être présentes.
select
  src.slug as source_slug,
  src.nom as source_nom,
  lic.code as licence_code,
  lic.url as licence_url,
  sync.code as synchro_code,
  sync.mode,
  sync.intervalle_jours,
  sync.description
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'CC-BY-4.0'
where sync.code = 'secheresse';
