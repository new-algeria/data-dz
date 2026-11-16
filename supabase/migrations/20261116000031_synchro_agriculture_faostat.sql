-- Synchronisation des séries nationales de production agricole depuis FAOSTAT QCL.
-- Les valeurs restent nationales : aucune ventilation artificielle par wilaya.

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
  'agriculture',
  '{"fr":"Agriculture","en":"Agriculture","ar":"الزراعة"}'::jsonb,
  'wheat',
  160
)
on conflict (slug) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'faostat-qcl',
  'FAOSTAT — Crops and livestock products (QCL)',
  'https://www.fao.org/faostat/en/#data/QCL',
  'synchronisee',
  'Base FAOSTAT QCL de la FAO. Séries nationales annuelles pour Algeria : production végétale et animale, superficies récoltées, rendements et autres éléments disponibles par produit et unité. Extraction du bulk CSV normalisé, filtre Area=Algeria. Les observations, unités et indicateurs d''origine sont conservés ; aucune ventilation par wilaya.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'agriculture-faostat',
  'Agriculture en Algérie — FAOSTAT QCL',
  (select id from public.sources where slug = 'faostat-qcl'),
  'interne',
  30,
  'Séries nationales FAOSTAT QCL par année, produit, indicateur et unité. Les séries couvrent les années et produits effectivement disponibles dans la source. Les unités ne sont pas additionnées entre elles. Pas de données par wilaya dans cette extraction.'
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
where sync.code = 'agriculture-faostat';
