-- Synchronisation mensuelle « Sécheresse, précipitations et humidité des sols ».
-- Source climatique : Copernicus C3S / ERA5-Land (CC-BY-4.0).
-- Le calcul est dans api-dz-backend/scripts/secheresse/ et le workflow secheresse-sync.yml.
-- L'agrégation utilise les contours GeoAlgeria des 69 wilayas (ODbL-1.0), sans redistribuer leurs géométries.
-- À exécuter dans Supabase SQL Editor après 20261102000017. Réexécutable sans doublons.

insert into public.sources (slug, nom, url, description)
values (
  'copernicus-era5-land',
  'Copernicus Climate Change Service (ERA5-Land)',
  'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means',
  'Réanalyse mensuelle ERA5-Land du Copernicus Climate Change Service (C3S), résolution native 0,1° (~9 km), DOI 10.24381/cds.68d2bb30, licence CC BY 4.0. Les données sont modélisées et publiées avec plusieurs semaines à quelques mois de retard.'
)
on conflict (slug) do nothing;

do $$
begin
  if not exists (select 1 from public.licences where code = 'CC-BY-4.0') then
    raise exception 'La licence CC-BY-4.0 doit exister dans public.licences avant la synchronisation ERA5-Land.';
  end if;
end
$$;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'secheresse',
  'Sécheresse, précipitations et humidité des sols',
  (select id from public.sources where slug = 'copernicus-era5-land'),
  'interne',
  30,
  'Indicateurs mensuels ERA5-Land (depuis 1981) : précipitations, normales et anomalies, SPI-3/SPI-12, humidité du sol 0–7, 7–28, 28–100 et 100–289 cm, percentiles saisonniers et température moyenne. Moyennes surfaciques par wilaya sur les 69 contours GeoAlgeria. Référence 1991–2020 ; produit mensuel avec environ trois mois de recul. Réanalyse modélisée, pas des mesures de station.'
)
on conflict (code) do nothing;

-- Vérification : source, licence et échéance doivent toutes être présentes.
select
  src.slug as source_slug,
  src.nom as source_nom,
  lic.code as licence_code,
  sync.code as synchro_code,
  sync.mode,
  sync.intervalle_jours,
  sync.description
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'CC-BY-4.0'
where sync.code = 'secheresse';
