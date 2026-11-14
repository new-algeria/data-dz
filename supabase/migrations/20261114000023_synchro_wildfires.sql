-- Synchronisation quotidienne des détections thermiques NASA FIRMS pour l'Algérie.
-- Les fichiers NASA sont CC0-1.0 ; les fichiers enrichis par wilaya utilisent GeoAlgeria (ODbL-1.0).
-- Le calcul est dans api-dz-backend/scripts/wildfires/ et le workflow GitHub Actions
-- .github/workflows/wildfires-sync.yml. La ligne règle l'échéance visible dans /admin/sync.
-- À appliquer dans le SQL Editor. Relançable sans modifier une ligne déjà configurée.

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description) values
  (
    'wildfires',
    'Détections thermiques NASA FIRMS',
    (select id from public.sources where slug = 'nasa-firms'),
    'interne',
    1,
    'Détections thermiques NRT MODIS et VIIRS de NASA FIRMS sur une fenêtre glissante de 7 jours UTC, affectées aux 69 wilayas par les contours GeoAlgeria. Ce sont des anomalies thermiques, pas des incendies confirmés ni des périmètres ou surfaces brûlées. Fichiers NASA CC0-1.0 ; fichiers enrichis GeoAlgeria ODbL-1.0.'
  )
on conflict (code) do nothing;
