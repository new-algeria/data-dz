-- Synchronisation hebdomadaire des matchs de l'équipe d'Algérie masculine de football (donnée equipe-algerie-foot-m).
-- Source : Mart Jürisoo, « International football results from 1872 » (github.com/martj42/international_results),
-- domaine public (CC0 1.0). Le robot (scripts/football de l'API) garde les matchs de l'Algérie depuis 1963 et calcule
-- les bilans par année, adversaire et compétition. À appliquer dans Supabase SQL Editor. Réexécutable sans doublons.

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
  'international-football-results',
  'International football results (Mart Jürisoo)',
  'https://github.com/martj42/international_results',
  'synchronisee',
  'Résultats de tous les matchs internationaux de football masculin depuis 1872, avec buteurs (partiels) et séances de tirs au but, tenus à jour par Mart Jürisoo. Data-DZ conserve les matchs de l''Algérie. Domaine public (CC0 1.0).'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'equipe-algerie-foot-m',
  'Équipe d''Algérie de football (hommes)',
  (select id from public.sources where slug = 'international-football-results'),
  'interne',
  7,
  'Tous les matchs de l''équipe A masculine depuis 1963, d''après International football results (CC0) : bilan annuel (fichier principal), matchs du point de vue algérien, bilans par adversaire et par compétition, tirs au but et buteurs. Les buteurs ne sont connus que pour environ 30 % des buts : jamais de classement des buteurs. Les matchs à venir (score inconnu) sont écartés jusqu''à ce qu''ils soient joués.'
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
  sync.intervalle_jours,
  sync.actif
from public.synchronisations as sync
left join public.sources as src on src.id = sync.source_id
left join public.licences as lic on lic.code = 'CC0-1.0'
where sync.code = 'equipe-algerie-foot-m';
