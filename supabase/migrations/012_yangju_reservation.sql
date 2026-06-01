-- ============================================================
-- 012_yangju_reservation.sql
-- Yangju reservation bot: own watch/alert table + reservation
-- attempt table (durable idempotency for irreversible bookings).
-- Separate from telegram_watches because the new bot has a separate
-- token => separate audience (a bot cannot message a user who has not
-- /start-ed THAT bot). Mirrors the 011 RLS/partial-unique patterns.
-- ============================================================

-- Watch/alert registrations for the yangju-only bot.
-- Shape mirrors telegram_watches but is yangju-only (no club_id / no
-- golf_clubs FK: there is no club-selection step).
CREATE TABLE yangju_reservation_watches (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id     BIGINT NOT NULL,
  date        DATE   NOT NULL,
  time_from   TIME   NOT NULL,
  time_to     TIME   NOT NULL,
  course      TEXT,                       -- nullable: null = any course
  status      TEXT   NOT NULL DEFAULT 'active' CHECK (status IN ('active','stopped')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yangju_watches_active ON yangju_reservation_watches (status, date);

-- Active-watch dedup (mirrors 011's partial unique on active). course may be
-- NULL; NULLs are distinct under a plain unique index, which is acceptable here
-- (a null-course "any" watch and a specific-course watch are genuinely different).
CREATE UNIQUE INDEX uq_yangju_watches_active
  ON yangju_reservation_watches (chat_id, date, time_from, time_to, course)
  WHERE status = 'active';

-- Reservation attempts: the durable idempotency + audit store.
-- INSERT-before-resOk: a row is claimed (status='pending') BEFORE the booking
-- POST so a Telegram webhook retry hits the unique conflict and aborts.
CREATE TABLE yangju_reservation_attempts (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id          BIGINT NOT NULL,
  date             DATE   NOT NULL,
  tee_time         TEXT   NOT NULL,       -- HHMM
  course           TEXT   NOT NULL,       -- e.g. 동 / 서
  resolved_pointid TEXT,                  -- server-side pointid at tap-time (resOk payload)
  status           TEXT   NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','dry_run','booked','failed')),
  idempotency_key  TEXT   NOT NULL,       -- {chat_id}|{date}|{tee_time}|{course}
  payload_log      TEXT,                  -- assembled body, logged before any live send
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yangju_attempts_chat_date ON yangju_reservation_attempts (chat_id, date, status);

-- Unique over the "claimed / in-flight / irreversible" set. A 'failed' attempt
-- (preflight-verified it never reached resOk) does NOT block a legitimate retry.
-- 'dry_run' is included so a dry run also claims the key for that test cycle.
CREATE UNIQUE INDEX uq_yangju_attempts_idem
  ON yangju_reservation_attempts (idempotency_key)
  WHERE status IN ('pending','confirmed','booked','dry_run');

ALTER TABLE yangju_reservation_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE yangju_reservation_attempts ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: only service_role (bypasses RLS) reads/writes.
