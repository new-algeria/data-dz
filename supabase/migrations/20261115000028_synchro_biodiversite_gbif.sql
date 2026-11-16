-- Synchronisation des statistiques GBIF sur la biodiversité en Algérie.
-- Le pipeline publie des facettes agrégées, sans fiche individuelle ni coordonnées précises.
-- Seules les occurrences géolocalisées, sans anomalie spatiale, présentes et CC0 / CC BY 4.0 sont comptées.

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
  'gbif-biodiversite-algerie',
  'GBIF — Occurrences de biodiversité en Algérie',
  'https://www.gbif.org/occurrence/search?country=DZ',
  'synchronisee',
  'API Occurrence GBIF, facettes statistiques pour country=DZ. Comptage des occurrences présentes, géolocalisées, sans anomalie géospatiale, sous licences CC0 1.0 ou CC BY 4.0. Le pipeline ne télécharge ni ne redistribue les fiches individuelles. Le champ stateProvince est conservé comme région déclarée, sans normalisation aux wilayas.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'biodiversite',
  'Biodiversité en Algérie — GBIF',
  (select id from public.sources where slug = 'gbif-biodiversite-algerie'),
  'interne',
  15,
  'Synthèse des occurrences GBIF en Algérie par année, règne, région déclarée et type d''enregistrement. Filtre country=DZ, occurrenceStatus=PRESENT, hasCoordinate=true, hasGeospatialIssue=false, licences CC0_1_0 et CC_BY_4_0. Requêtes par facettes avec limit=0, sans export individuel. Les régions stateProvince ne sont pas harmonisées aux wilayas et les occurrences ne mesurent pas l''abondance réelle des espèces.'
)
on conflict (code) do nothing;

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
where sync.code = 'biodiversite';
