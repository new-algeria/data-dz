-- Couverture nationale du calendrier des jours fériés algériens.
-- Les cartes du catalogue lisent la couverture depuis datasets.wilayas.
update public.datasets
set wilayas = array(
  select lpad(numero::text, 2, '0')
  from generate_series(1, 69) as serie(numero)
)
where slug = 'jours-feries-en-algerie-2020-2030'
  and coalesce(cardinality(wilayas), 0) = 0;
