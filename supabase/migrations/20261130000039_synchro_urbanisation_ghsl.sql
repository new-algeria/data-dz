-- Synchronisation de l'étalement urbain : surface bâtie par wilaya (GHSL, Centre commun de recherche de la Commission européenne).
-- Source : GHS-BUILT-S R2023A (1975–2030, pas de 5 ans ; 2025 et 2030 projetées), tuiles de 3 secondes d'arc,
-- licence CC BY 4.0 (© Union européenne), téléchargement sans compte.
-- Le robot (dépôt de l'API, scripts/urbanisation/) additionne la surface bâtie dans les contours des 69 wilayas
-- et publie la donnée `surface-batie-wilayas`.
-- À appliquer dans Supabase SQL Editor AVANT de lancer la GitHub Action. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values ('CC-BY-4.0', 'Creative Commons Attribution 4.0 International', 'https://creativecommons.org/licenses/by/4.0/', true, true, false)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'ghsl-jrc',
  'GHSL — Global Human Settlement Layer (Commission européenne, JRC)',
  'https://human-settlement.emergency.copernicus.eu/',
  'synchronisee',
  'Cartes mondiales des zones bâties et de la population produites par le Centre commun de recherche (JRC) de la Commission européenne à partir des images satellites Landsat et Sentinel-2, de 1975 à 2030 (projections au-delà de 2020). Licence CC BY 4.0, © Union européenne. Mesures satellites, avec une marge d''erreur.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'urbanisation',
  'Étalement urbain (surface bâtie) — GHSL',
  (select id from public.sources where slug = 'ghsl-jrc'),
  'interne',
  365,
  'Surface bâtie de chacune des 69 wilayas tous les 5 ans de 1975 à 2030 (GHS-BUILT-S R2023A), avec la part du territoire bâtie et la surface bâtie par habitant. Le JRC publie une nouvelle version tous les deux ou trois ans : une version n''est publiée que si les chiffres ont changé.'
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
where sync.code = 'urbanisation';
