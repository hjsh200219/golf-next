-- ============================================================
-- seed_club_name_aliases.sql
-- Canonical alias seeds for resolving scraped cc_name values.
--
-- Base rule: each golf_club auto-registers its own normalized
-- name / display_name as an alias pointing to itself.
-- Extra rules: known cross-platform collisions (e.g. onetheclub
-- surfaces 사우스스프링스CC rows) map to their canonical club.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Self-aliases generated from golf_clubs.
--    Uses pg built-ins so the seed stays in sync with the club
--    table without manually enumerating every row.
-- ------------------------------------------------------------
INSERT INTO club_name_aliases (alias, canonical_club_id, raw_sample)
SELECT DISTINCT
    regexp_replace(
        regexp_replace(
            lower(coalesce(display_name, name)),
            '(country club|golf club|golf ?& ?resort|resort|골프앤리조트|골프리조트|컨트리클럽|골프클럽|골프장|리조트| gcc| cc| gc|gcc|cc|gc)\s*$',
            '',
            'g'
        ),
        '[^[:alnum:]가-힣]',
        '',
        'g'
    ) AS alias,
    id AS canonical_club_id,
    coalesce(display_name, name) AS raw_sample
FROM golf_clubs
WHERE coalesce(display_name, name) IS NOT NULL
ON CONFLICT (alias) DO NOTHING;

-- Also register raw (non-stripped) name so spellings that keep the
-- CC/GC suffix still normalize correctly once the utility strips them.
-- (The util strips those suffixes, so the self-alias above already
-- covers both cases. This block is defensive against future suffix
-- shape we haven't seen yet.)

-- ------------------------------------------------------------
-- 2. Known aliases observed from multi-club reservation platforms.
--    onetheclub.com serves tee-times for southspring under a
--    "사우스스프링스" label; route those to the real club id.
-- ------------------------------------------------------------
INSERT INTO club_name_aliases (alias, canonical_club_id, raw_sample)
VALUES
    ('사우스스프링스', 'southspring', '사우스스프링스 (onetheclub 관측)')
ON CONFLICT (alias) DO NOTHING;
