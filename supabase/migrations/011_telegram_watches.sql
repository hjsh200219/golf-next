-- ============================================================
-- 011_telegram_watches.sql
-- Telegram tee-time watch alerts table
-- ============================================================

CREATE TABLE telegram_watches (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id     BIGINT NOT NULL,
  club_id     TEXT   NOT NULL REFERENCES golf_clubs(id),
  date        DATE   NOT NULL,
  time_from   TIME   NOT NULL,
  time_to     TIME   NOT NULL,
  status      TEXT   NOT NULL DEFAULT 'active' CHECK (status IN ('active','stopped')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_watches_active ON telegram_watches (status, date);

CREATE UNIQUE INDEX uq_telegram_watches_active
  ON telegram_watches (chat_id, club_id, date, time_from, time_to) WHERE status = 'active';

ALTER TABLE telegram_watches ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: only service_role (bypasses RLS) reads/writes.
