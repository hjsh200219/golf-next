-- ============================================================
-- 001_initial_schema.sql
-- Golf-Next full database schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

-- ------------------------------------------------------------
-- golf_clubs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS golf_clubs (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    display_name          TEXT,
    url                   TEXT,
    origin                TEXT,
    referer_login         TEXT,
    referer_reservation   TEXT,
    login_path            TEXT,
    reservation_path      TEXT,
    address               TEXT,
    lat                   DOUBLE PRECISION,
    lon                   DOUBLE PRECISION,
    scraper_type          TEXT NOT NULL DEFAULT 'requests',
    is_active             BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- golf_club_courses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS golf_club_courses (
    id          SERIAL PRIMARY KEY,
    club_id     TEXT NOT NULL REFERENCES golf_clubs(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    course_code TEXT,
    lat         DOUBLE PRECISION,
    lon         DOUBLE PRECISION,
    address     TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- ------------------------------------------------------------
-- tee_times
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tee_times (
    id          BIGSERIAL PRIMARY KEY,
    club_id     TEXT NOT NULL REFERENCES golf_clubs(id) ON DELETE CASCADE,
    cc_name     TEXT,
    date        DATE NOT NULL,
    teeoff      TIME NOT NULL,
    course      TEXT,
    price       INTEGER,
    event       TEXT,
    scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (club_id, date, teeoff, course)
);

-- ------------------------------------------------------------
-- user_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name  TEXT,
    phone         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- user_favorites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_favorites (
    id        SERIAL PRIMARY KEY,
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id   TEXT NOT NULL REFERENCES golf_clubs(id) ON DELETE CASCADE,
    UNIQUE (user_id, club_id)
);

-- ------------------------------------------------------------
-- device_favorites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_favorites (
    id               SERIAL PRIMARY KEY,
    device_id        TEXT NOT NULL,
    club_id          TEXT NOT NULL REFERENCES golf_clubs(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, club_id)
);

-- ------------------------------------------------------------
-- scrape_jobs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    total_clubs     INTEGER,
    completed_clubs INTEGER,
    failed_clubs    TEXT[],
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- scrape_club_results
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scrape_club_results (
    id             BIGSERIAL PRIMARY KEY,
    job_id         BIGINT NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    club_id        TEXT NOT NULL REFERENCES golf_clubs(id) ON DELETE CASCADE,
    status         TEXT NOT NULL DEFAULT 'pending',
    error_message  TEXT,
    tee_time_count INTEGER NOT NULL DEFAULT 0,
    duration_ms    INTEGER,
    scraped_at     TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- weather_cache
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_cache (
    id         BIGSERIAL PRIMARY KEY,
    geohash    TEXT NOT NULL,
    lat        DOUBLE PRECISION NOT NULL,
    lon        DOUBLE PRECISION NOT NULL,
    data_type  TEXT NOT NULL,
    data       JSONB NOT NULL,
    cached_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (geohash, data_type)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- golf_clubs
CREATE INDEX IF NOT EXISTS idx_golf_clubs_is_active      ON golf_clubs (is_active);
CREATE INDEX IF NOT EXISTS idx_golf_clubs_scraper_type   ON golf_clubs (scraper_type);

-- golf_club_courses
CREATE INDEX IF NOT EXISTS idx_golf_club_courses_club_id ON golf_club_courses (club_id);
CREATE INDEX IF NOT EXISTS idx_golf_club_courses_active  ON golf_club_courses (club_id) WHERE is_active = true;

-- tee_times (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_tee_times_club_date        ON tee_times (club_id, date);
CREATE INDEX IF NOT EXISTS idx_tee_times_date             ON tee_times (date);
CREATE INDEX IF NOT EXISTS idx_tee_times_scraped_at       ON tee_times (scraped_at);
CREATE INDEX IF NOT EXISTS idx_tee_times_date_teeoff      ON tee_times (date, teeoff);

-- user_favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id     ON user_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_club_id     ON user_favorites (club_id);

-- device_favorites
CREATE INDEX IF NOT EXISTS idx_device_favorites_device_id ON device_favorites (device_id);
CREATE INDEX IF NOT EXISTS idx_device_favorites_club_id   ON device_favorites (club_id);

-- scrape_jobs
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_date           ON scrape_jobs (date);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status         ON scrape_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at     ON scrape_jobs (created_at DESC);

-- scrape_club_results
CREATE INDEX IF NOT EXISTS idx_scrape_club_results_job_id  ON scrape_club_results (job_id);
CREATE INDEX IF NOT EXISTS idx_scrape_club_results_club_id ON scrape_club_results (club_id);
CREATE INDEX IF NOT EXISTS idx_scrape_club_results_status  ON scrape_club_results (status);

-- weather_cache
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires_at   ON weather_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_weather_cache_geohash      ON weather_cache (geohash);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_golf_clubs
    BEFORE UPDATE ON golf_clubs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE golf_clubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_club_courses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_times           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_favorites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_club_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache       ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- golf_clubs: public read
-- ------------------------------------------------------------
CREATE POLICY "golf_clubs_public_read"
    ON golf_clubs FOR SELECT
    USING (true);

-- ------------------------------------------------------------
-- golf_club_courses: public read
-- ------------------------------------------------------------
CREATE POLICY "golf_club_courses_public_read"
    ON golf_club_courses FOR SELECT
    USING (true);

-- ------------------------------------------------------------
-- tee_times: public read
-- ------------------------------------------------------------
CREATE POLICY "tee_times_public_read"
    ON tee_times FOR SELECT
    USING (true);

-- tee_times: service role can insert/update/delete (scrapers run as service role)
CREATE POLICY "tee_times_service_write"
    ON tee_times FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- user_profiles: owner only
-- ------------------------------------------------------------
CREATE POLICY "user_profiles_select_own"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "user_profiles_insert_own"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update_own"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_delete_own"
    ON user_profiles FOR DELETE
    USING (auth.uid() = id);

-- ------------------------------------------------------------
-- user_favorites: owner only
-- ------------------------------------------------------------
CREATE POLICY "user_favorites_select_own"
    ON user_favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_favorites_insert_own"
    ON user_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_favorites_delete_own"
    ON user_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- device_favorites: public read/write by device_id (no auth required)
-- ------------------------------------------------------------
CREATE POLICY "device_favorites_select_all"
    ON device_favorites FOR SELECT
    USING (true);

CREATE POLICY "device_favorites_insert_all"
    ON device_favorites FOR INSERT
    WITH CHECK (true);

CREATE POLICY "device_favorites_update_all"
    ON device_favorites FOR UPDATE
    USING (true);

CREATE POLICY "device_favorites_delete_all"
    ON device_favorites FOR DELETE
    USING (true);

-- ------------------------------------------------------------
-- scrape_jobs: service role only
-- ------------------------------------------------------------
CREATE POLICY "scrape_jobs_service_all"
    ON scrape_jobs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- authenticated users can read scrape_jobs (for dashboard)
CREATE POLICY "scrape_jobs_authenticated_read"
    ON scrape_jobs FOR SELECT
    USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- scrape_club_results: service role only
-- ------------------------------------------------------------
CREATE POLICY "scrape_club_results_service_all"
    ON scrape_club_results FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "scrape_club_results_authenticated_read"
    ON scrape_club_results FOR SELECT
    USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- weather_cache: public read, service role write
-- ------------------------------------------------------------
CREATE POLICY "weather_cache_public_read"
    ON weather_cache FOR SELECT
    USING (true);

CREATE POLICY "weather_cache_service_write"
    ON weather_cache FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
