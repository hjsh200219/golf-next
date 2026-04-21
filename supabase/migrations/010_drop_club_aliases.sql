-- ============================================================
-- 010_drop_club_aliases.sql
-- Roll back alias canonicalization. Keep raw cc_name from scrapers.
-- ============================================================

DROP TABLE IF EXISTS public.club_alias_misses;
DROP TABLE IF EXISTS public.club_name_aliases;
