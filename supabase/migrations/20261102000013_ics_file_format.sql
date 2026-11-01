-- Autorise l’enregistrement des calendriers iCalendar comme fichiers natifs de données.
alter type public.format_fichier add value if not exists 'ics';
