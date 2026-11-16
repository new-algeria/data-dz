-- Prix des produits alimentaires par wilaya.
-- Source initiale réellement publique et parsable : Direction du commerce de Jijel.
-- La plateforme centrale du ministère du Commerce est intranet ; les bulletins MADRP nationaux
-- ne sont pas ventilés par wilaya et ne doivent pas être utilisés comme substitut.
-- À appliquer dans Supabase SQL Editor après 20261102000017. Réexécutable.

insert into public.categories (slug, nom, icone, ordre)
values (
  'economie',
  '{"fr":"Économie & prix","en":"Economy & prices","ar":"الاقتصاد والأسعار"}'::jsonb,
  'chart-no-axes-combined',
  160
)
on conflict (slug) do nothing;

insert into public.sources (slug, nom, url, type, description)
values (
  'directions-commerce-wilayas',
  'Directions du commerce des wilayas',
  'https://www.commerce.gov.dz/fr/observation-des-prix',
  'synchronisee',
  'Relevés publics publiés par certaines Directions du commerce de wilaya. La plateforme nationale d’observation des prix du ministère est annoncée comme accessible via l’intranet MCIRMN ; seules les pages publiques vérifiables sont collectées. La couverture est donc partielle et variable.'
)
on conflict (slug) do nothing;

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description, config)
values (
  'prix-alimentaires',
  'Prix alimentaires par wilaya',
  (select id from public.sources where slug = 'directions-commerce-wilayas'),
  'interne',
  1,
  'Collecte quotidienne des relevés publics des Directions du commerce de wilaya. Périmètre initial vérifié : Jijel. Les nouvelles wilayas ne sont ajoutées qu’après vérification de la page source et du format. Les prix absents restent null ; aucune extrapolation ni imputation.',
  jsonb_build_object(
    'couverture', 'partielle',
    'sources_publiques', jsonb_build_array(
      jsonb_build_object(
        'code_wilaya', '18',
        'wilaya', 'Jijel',
        'organisme', 'Direction du commerce de la wilaya de Jijel',
        'url', 'https://dcwjijel.dz/index.php/moy-prix/prix-journ',
        'frequence', 'quotidienne'
      )
    ),
    'exclure', jsonb_build_array(
      'Plateforme nationale du ministère du Commerce : accès intranet',
      'Bulletins nationaux MADRP : non ventilés par wilaya'
    )
  )
)
on conflict (code) do update
set source_id = excluded.source_id,
    description = excluded.description,
    config = excluded.config;

-- Vérification : la source et la synchronisation doivent exister, et la source initiale doit être configurée.
select
  s.code,
  s.nom,
  src.slug as source_slug,
  s.intervalle_jours,
  s.config ->> 'couverture' as couverture,
  jsonb_array_length(s.config -> 'sources_publiques') as sources_publiques
from public.synchronisations s
left join public.sources src on src.id = s.source_id
where s.code = 'prix-alimentaires';
