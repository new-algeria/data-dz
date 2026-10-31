-- Données que data-dz n'a pas le droit de redistribuer, et licences corrigées à la main.
--
-- 1. `diffusion_restreinte` : la fiche reste visible (titre, description, colonnes, chiffres), mais l'API
--    ne sert plus aucun fichier ni aucune ligne (/download, /data, /sample : 403 `not_redistributable`,
--    pas d'aperçu dans la fiche, `ressources` vide). Le site remplace « Télécharger » et l'API par un lien
--    vers le paquet npm de la source et retire le badge « Source vérifiée ».
-- 2. `licence_manuelle` : la synchronisation hebdomadaire (PUT /v1/admin/datasets/:slug) ne réécrit plus
--    `licence_code` ni `licence_details` : une licence corrigée ici n'est pas écrasée la semaine suivante.
--
-- Écrites uniquement à la main (SQL Editor) : l'API et le site ne font que les lire.
-- À appliquer AVANT de déployer l'API et le site qui s'en servent.

alter table public.datasets
  add column if not exists diffusion_restreinte boolean not null default false,
  add column if not exists licence_manuelle boolean not null default false;

comment on column public.datasets.diffusion_restreinte is
  'Fichiers non redistribuables par data-dz : fiche visible, téléchargement et API remplacés par un lien vers le paquet de la source.';
comment on column public.datasets.licence_manuelle is
  'Licence corrigée à la main : la synchronisation ne réécrit pas licence_code ni licence_details.';

-- Algérie Poste et Protection civile (GeoAlgeria) : jeux non ouverts, à ne pas republier.
update public.datasets
set diffusion_restreinte = true
where slug in ('poste', 'protection-civile');

-- Protection civile : le registre de la DGPC n'a aucune licence ouverte ; seules les coordonnées
-- vérifiées sur OpenStreetMap sont sous ODbL.
update public.datasets
set licence_code = null,
    licence_details = 'Registre de la Direction générale de la Protection civile (DGPC) : aucune licence ouverte, données non redistribuables. Seules les coordonnées vérifiées sur OpenStreetMap sont sous ODbL-1.0 (© contributeurs OpenStreetMap).',
    licence_manuelle = true
where slug = 'protection-civile';
