-- Synchronisation du commerce extérieur de l'Algérie (BACI, CEPII).
-- Source : CEPII, base BACI (flux bilatéraux réconciliés à partir de UN Comtrade), nomenclature SH 1992, depuis 1995,
-- Licence Ouverte Etalab 2.0, téléchargement sans compte.
-- Le robot (dépôt de l'API, scripts/commerce-exterieur/) publie la donnée `commerce-exterieur-algerie`.
-- À appliquer dans Supabase SQL Editor AVANT de lancer la GitHub Action. Réexécutable sans doublons.

insert into public.licences (code, nom, url, usage_commercial, attribution_requise, partage_identique)
values ('etalab-2.0', 'Licence Ouverte Etalab 2.0', 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/', true, true, false)
on conflict (code) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'cepii-baci',
  'CEPII — BACI (commerce international)',
  'https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37',
  'synchronisee',
  'Base du CEPII (centre de recherche français en économie internationale) qui réconcilie les déclarations douanières des pays (UN Comtrade) : échanges bilatéraux de biens par produit (Système harmonisé à 6 chiffres) depuis 1995, en dollars et en tonnes. Licence Ouverte Etalab 2.0. Valeurs FAB, environ deux ans de décalage.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description)
values (
  'commerce-exterieur',
  'Commerce extérieur — BACI (CEPII)',
  (select id from public.sources where slug = 'cepii-baci'),
  'interne',
  30,
  'Exportations et importations de biens de l''Algérie depuis 1995, par partenaire, par produit et par section du Système harmonisé. L''archive (2,4 Go) n''est téléchargée que lorsque le CEPII publie une nouvelle version, en général une fois par an.'
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
left join public.licences as lic on lic.code = 'etalab-2.0'
where sync.code = 'commerce-exterieur';
