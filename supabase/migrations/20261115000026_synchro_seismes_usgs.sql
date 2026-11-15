-- Synchronisation quotidienne des séismes USGS NEIC/PDE en Algérie.
-- Les événements USGS demandés au contributeur NEIC/PDE sont CC0-1.0.
-- Les fichiers enrichis par wilaya utilisent GeoAlgeria (ODbL-1.0).
-- Script : api-dz-backend/scripts/seismes/ ; workflow : .github/workflows/seismes-sync.yml.
-- À appliquer dans Supabase SQL Editor après 20261102000017. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values (
  'CC0-1.0',
  'Creative Commons Zero v1.0 Universal',
  'https://creativecommons.org/publicdomain/zero/1.0/',
  true,
  false,
  false
)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'usgs-comcat',
  'USGS — NEIC / Preliminary Determination of Epicenters (PDE)',
  'https://earthquake.usgs.gov/data/comcat/catalog/us/',
  'synchronisee',
  'Événements du catalogue USGS NEIC/PDE interrogés via l’API FDSN avec catalog=us et contributor=us. Périmètre : épicentres à l’intérieur des 69 wilayas, magnitude ≥ 2,5, depuis 1973. Sous-ensemble du catalogue mondial ; ce n’est pas le catalogue national exhaustif du CRAAG.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'seismes',
  'Séismes en Algérie — USGS NEIC/PDE',
  (select id from public.sources where slug = 'usgs-comcat'),
  'interne',
  1,
  'Collecte quotidienne des événements USGS NEIC/PDE (catalog=us, contributor=us), magnitude ≥ 2,5, épicentres dans les 69 contours GeoAlgeria. Période depuis 1973. Les fichiers sources USGS sont CC0-1.0 ; les fichiers enrichis et agrégés par wilaya sont ODbL-1.0. Sous-ensemble non exhaustif par rapport au catalogue national CRAAG ; couverture et complétude variables.'
)
on conflict (code) do nothing;

-- Vérification : la source, la licence et la synchronisation doivent être présentes.
select
  synchro.code,
  synchro.nom,
  src.slug as source_slug,
  src.url as source_url,
  lic.code as licence_code,
  lic.url as licence_url,
  synchro.mode,
  synchro.intervalle_jours,
  synchro.description
from public.synchronisations as synchro
left join public.sources as src on src.id = synchro.source_id
left join public.licences as lic on lic.code = 'CC0-1.0'
where synchro.code = 'seismes';
