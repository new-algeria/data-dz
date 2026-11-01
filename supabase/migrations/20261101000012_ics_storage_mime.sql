-- Autorise le MIME standard des calendriers iCalendar dans les fichiers de propositions.
-- La liste existante est conservée et les buckets sans restriction restent sans restriction.
update storage.buckets
set allowed_mime_types = case
  when allowed_mime_types is null or 'text/calendar' = any (allowed_mime_types)
    then allowed_mime_types
  else array_append(allowed_mime_types, 'text/calendar')
end
where id = 'soumissions';
