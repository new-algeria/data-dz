-- Synchronisation mensuelle du pétrole et du gaz naturel de l'Algérie (EIA).
-- Source : U.S. Energy Information Administration, International Energy Statistics, fichier groupé INTL.zip (sans clé).
-- Le robot (dépôt de l'API, scripts/petrole-gaz/) garde 8 séries annuelles de l'Algérie et publie la donnée
-- `petrole-gaz-algerie` (séries en format long et bilan annuel).
-- À appliquer dans Supabase SQL Editor AVANT de lancer la GitHub Action. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values (
  'PDM-1.0',
  'Domaine public (Public Domain Mark 1.0)',
  'https://creativecommons.org/publicdomain/mark/1.0/',
  true,
  false,
  false
)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'eia',
  'U.S. Energy Information Administration (EIA)',
  'https://www.eia.gov/international/data/country/DZA',
  'synchronisee',
  'Agence statistique du département de l''Énergie des États-Unis. Ses statistiques internationales couvrent la production, la consommation et les échanges d''énergie de chaque pays, chaque année depuis 1980 (1973 pour le pétrole). Travaux du gouvernement fédéral américain : domaine public ; l''EIA demande d''être citée. La dernière année peut être une estimation provisoire.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'petrole-gaz',
  'Pétrole et gaz naturel — EIA',
  (select id from public.sources where slug = 'eia'),
  'interne',
  30,
  'Séries annuelles de l''Algérie : production de pétrole brut, de pétrole et autres liquides et de liquides de gaz naturel, consommation de pétrole, exportations de brut ; production, consommation et exportations de gaz naturel (milliers de barils par jour, milliards de m³). Valeurs absentes laissées vides. Une version n''est publiée que si l''EIA a ajouté une année ou révisé des valeurs.'
)
on conflict (code) do nothing;

-- Vérification : la source, la licence et la synchronisation doivent être présentes.
select
  sync.code,
  sync.nom,
  src.slug as source_slug,
  src.url as source_url,
  lic.code as licence_code,
  sync.mode,
  sync.intervalle_jours
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'PDM-1.0'
where sync.code = 'petrole-gaz';
