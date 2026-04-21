-- ============================================================
-- 002_club_name_aliases.sql
-- Canonicalize scraped cc_name values to a single golf_club
-- ============================================================

-- ------------------------------------------------------------
-- club_name_aliases
--   Maps normalized cc_name strings to a canonical club_id.
--   Scrapers that serve multi-club reservation platforms
--   (e.g. onetheclub) can produce rows whose cc_name belongs
--   to another club. Resolving via this table avoids creating
--   duplicate listings in the UI.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS club_name_aliases (
    id                BIGSERIAL PRIMARY KEY,
    alias             TEXT NOT NULL UNIQUE,
    canonical_club_id TEXT NOT NULL REFERENCES golf_clubs(id) ON DELETE CASCADE,
    raw_sample        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_name_aliases_canonical
    ON club_name_aliases (canonical_club_id);

-- ------------------------------------------------------------
-- club_alias_misses
--   Observed cc_name values that did not resolve to a canonical
--   club. Useful for operators to add new aliases.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS club_alias_misses (
    id              BIGSERIAL PRIMARY KEY,
    alias           TEXT NOT NULL,
    raw_cc_name     TEXT NOT NULL,
    source_club_id  TEXT NOT NULL,
    hit_count       INTEGER NOT NULL DEFAULT 1,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (alias, source_club_id)
);

CREATE INDEX IF NOT EXISTS idx_club_alias_misses_alias
    ON club_alias_misses (alias);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE club_name_aliases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_alias_misses  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_name_aliases_public_read" ON club_name_aliases;
CREATE POLICY "club_name_aliases_public_read"
    ON club_name_aliases FOR SELECT
    USING (true);

-- misses: read only via service role (no public policy)
