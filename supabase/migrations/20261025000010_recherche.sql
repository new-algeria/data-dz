-- =====================================================================
-- data-dz · Bloc 10 : recherche tolérante dans tout le contenu des fiches
-- À coller dans Supabase → SQL Editor → New query → Run (après le bloc 9)
--
-- rpc("rechercher_datasets", { terme }) renvoie les données publiées qui correspondent, les plus
-- pertinentes d'abord. Chaque mot cherché doit apparaître quelque part :
--   - sans tenir compte des accents ni des majuscules (« ecole » trouve « Écoles ») ;
--   - en début de mot (« pharmacie » trouve « pharmacies ») ;
--   - au milieu d'un mot de 4 lettres ou plus (« صيدليات » trouve « الصيدليات ») ;
--   - avec une faute de frappe dans le titre, les mots-clés, la catégorie ou la source (« pharmasie »).
-- Contenu parcouru : titres, mots-clés, catégorie, source (poids fort), puis descriptions, README,
-- notes de version, noms des colonnes, aperçu, licence et informations de la source.
-- Fonction en « security invoker » : la RLS décide toujours de ce qui est visible.
-- =====================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- Minuscules, sans accents, ponctuation remplacée par des espaces, entouré d'espaces (« début de mot » = « ' ' || mot »).
create or replace function public.normaliser_recherche(texte text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select ' ' || btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(texte, ''))),
    '[[:space:][:punct:]«»“”‘’„…–—،؛؟]+', ' ', 'g'
  )) || ' ';
$$;

-- Valeurs texte et nombres d'un document JSON (aperçu, informations de la source), sans les clés.
create or replace function public.valeurs_json(document jsonb)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select coalesce(string_agg(valeur #>> '{}', ' '), '')
  from jsonb_path_query(coalesce(document, 'null'::jsonb), 'strict $.** ? (@.type() == "string" || @.type() == "number")') as valeur;
$$;

create or replace function public.rechercher_datasets(terme text)
returns table (slug text, pertinence real)
language sql stable
set search_path = ''
as $$
  with mots as (
    select distinct mot
    from regexp_split_to_table(btrim(public.normaliser_recherche(left(terme, 200))), ' ') as mot
    where char_length(mot) >= 2
    limit 8
  ),
  documents as (
    select
      d.slug,
      public.normaliser_recherche(concat_ws(' ',
        d.titre ->> 'fr', d.titre ->> 'en', d.titre ->> 'ar',
        array_to_string(d.mots_cles, ' '),
        c.nom ->> 'fr', c.nom ->> 'en', c.nom ->> 'ar',
        s.nom, s.slug
      )) as principal,
      public.normaliser_recherche(concat_ws(' ',
        d.description ->> 'fr', d.description ->> 'en', d.description ->> 'ar',
        d.readme, d.licence_code, d.licence_details, public.valeurs_json(d.infos_source),
        v.notes,
        case when jsonb_typeof(v.colonnes) = 'array'
          then (select string_agg(colonne ->> 'nom', ' ') from jsonb_array_elements(v.colonnes) as colonne) end,
        public.valeurs_json(v.apercu)
      )) as detail
    from public.datasets d
    left join public.categories c on c.slug = d.categorie_slug
    left join public.sources s on s.id = d.source_id
    left join public.versions v on v.id = d.version_courante_id
    where d.statut = 'publie'
  ),
  notes as (
    select documents.slug,
      case
        when strpos(documents.principal, ' ' || mots.mot) > 0 then 4
        when char_length(mots.mot) >= 4 and strpos(documents.principal, mots.mot) > 0 then 3
        when char_length(mots.mot) >= 4 and extensions.word_similarity(mots.mot, documents.principal) >= 0.6 then 2
        when strpos(documents.detail, ' ' || mots.mot) > 0 then 1
        when char_length(mots.mot) >= 4 and strpos(documents.detail, mots.mot) > 0 then 0.5
        else 0
      end as note
    from documents cross join mots
  )
  select notes.slug, sum(notes.note)::real as pertinence
  from notes
  group by notes.slug
  having bool_and(notes.note > 0)
  order by pertinence desc, notes.slug
  limit 500;
$$;

revoke execute on function public.rechercher_datasets(text) from public;
grant execute on function public.normaliser_recherche(text) to anon, authenticated, service_role;
grant execute on function public.valeurs_json(jsonb)        to anon, authenticated, service_role;
grant execute on function public.rechercher_datasets(text)  to anon, authenticated, service_role;
