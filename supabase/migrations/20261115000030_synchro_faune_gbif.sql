-- Catalogue agrégé des espèces animales d'Algérie depuis GBIF.
-- Les occurrences individuelles et leurs coordonnées précises ne sont jamais publiées.
-- Le catalogue inclut les occurrences présentes, même sans coordonnées, sous CC0 / CC BY.

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
  'gbif-faune-algerie',
  'GBIF — Faune d''Algérie',
  'https://www.gbif.org/occurrence/search?country=DZ',
  'synchronisee',
  'Téléchargement GBIF Darwin Core Archive pour country=DZ, occurrenceStatus=PRESENT et licences CC0 1.0 / CC BY 4.0. Agrégation locale par espèce animale, catégorie IUCN disponible, année, type d''enregistrement et région GADM de niveau 1. Les occurrences individuelles et coordonnées précises ne sont pas redistribuées.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'faune-algerie',
  'Faune d''Algérie — GBIF',
  (select id from public.sources where slug = 'gbif-faune-algerie'),
  'interne',
  30,
  'Catalogue agrégé des espèces animales GBIF présentes en Algérie. Téléchargement DWCA complet ; agrégation par espèce acceptée, statut IUCN disponible, année, type de preuve et région GADM de niveau 1. Les occurrences ne mesurent pas les effectifs de population. Aucun identifiant d''occurrence, observateur, lieu précis ou coordonnée n''est publié.'
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
where sync.code = 'faune-algerie';
