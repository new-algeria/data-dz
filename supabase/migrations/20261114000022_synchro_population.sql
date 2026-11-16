-- Synchronisation « population » : population par wilaya (WorldPop), renouvelée une fois par an.
-- Le robot est dans le dépôt de l'API (scripts/population/, .github/workflows/population-sync.yml) : il lit
-- l'échéance de cette ligne (GET /v1/admin/sync/population) et y dépose ses rapports, visibles dans /admin/sync.
-- À appliquer dans le SQL Editor (après 20261102000017). Relançable sans erreur.

insert into public.synchronisations (code, nom, source_id, mode, intervalle_jours, description) values
  ('population', 'Population par wilaya (WorldPop)', (select id from public.sources where slug = 'worldpop'), 'interne', 365,
   'Grilles de population WorldPop (CC BY 4.0) additionnées dans les contours des 69 wilayas, de 2015 à 2030 (scripts/population du dépôt de l''API, GitHub Action mensuelle qui ne travaille qu''à l''échéance). Nouvelle version seulement si les chiffres changent.')
on conflict (code) do nothing;
