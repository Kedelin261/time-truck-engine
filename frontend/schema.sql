-- Trucking.Time — D1 Schema
-- Run: wrangler d1 execute trucking-time-db --remote --file=schema.sql

-- ── Preferences ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preferences (
  user_id              TEXT PRIMARY KEY,
  home_state           TEXT    DEFAULT 'DE',
  home_city            TEXT    DEFAULT '',
  equipment_type       TEXT    DEFAULT 'BOX_TRUCK_26',
  max_deadhead_miles   INTEGER DEFAULT 50,
  min_total_miles      INTEGER DEFAULT 250,
  min_dollars_per_mile REAL    DEFAULT 2.00,
  company_name         TEXT    DEFAULT '',
  owner_name           TEXT    DEFAULT '',
  mc_number            TEXT    DEFAULT '',
  dot_number           TEXT    DEFAULT '',
  company_phone        TEXT    DEFAULT '',
  company_email        TEXT    DEFAULT '',
  company_website      TEXT    DEFAULT '',
  phone_number         TEXT    DEFAULT '',
  email                TEXT    DEFAULT '',
  sms_enabled          INTEGER DEFAULT 0,
  email_enabled        INTEGER DEFAULT 0,
  subscription_tier    TEXT    DEFAULT 'FREE',
  dat_token_encrypted  TEXT    DEFAULT '',
  updated_at           TEXT    DEFAULT (datetime('now'))
);

-- ── Trucks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trucks (
  truck_id        TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  truck_number    TEXT DEFAULT '',
  driver_name     TEXT DEFAULT '',
  current_city    TEXT DEFAULT '',
  current_state   TEXT DEFAULT '',
  equipment_type  TEXT DEFAULT 'DRY_VAN',
  status          TEXT DEFAULT 'AVAILABLE',
  notes           TEXT DEFAULT '',
  available_date  TEXT DEFAULT '',
  last_updated    TEXT DEFAULT (datetime('now'))
);

-- ── Brokers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brokers (
  broker_id           TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  broker_name         TEXT DEFAULT '',
  broker_company      TEXT DEFAULT '',
  broker_phone        TEXT DEFAULT '',
  broker_email        TEXT DEFAULT '',
  mc_number           TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  status              TEXT DEFAULT 'NEW',
  follow_up_count     INTEGER DEFAULT 0,
  intro_email_sent_at TEXT DEFAULT NULL,
  last_follow_up_at   TEXT DEFAULT NULL,
  created_at          TEXT DEFAULT (datetime('now'))
);

-- ── Bookings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            TEXT NOT NULL,
  load_id            TEXT DEFAULT '',
  origin_state       TEXT DEFAULT '',
  destination_state  TEXT DEFAULT '',
  total_miles        INTEGER DEFAULT 0,
  deadhead_miles     INTEGER DEFAULT 0,
  dollars_per_mile   REAL    DEFAULT 0,
  equipment_type     TEXT    DEFAULT '',
  booked_at          TEXT    DEFAULT (datetime('now'))
);

-- ── Broker Activity Feed ───────────────────────────────────────────────────
-- Stores every load movement a broker posts throughout the day.
-- Rows are keyed by broker_company + activity_date so they auto-reset at midnight.
-- The engine generates realistic intraday activity; real DAT data would replace
-- the stub generator once a live DAT token is connected.
CREATE TABLE IF NOT EXISTS broker_activity (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          TEXT    NOT NULL,          -- owner of this pipeline view
  broker_id        TEXT    NOT NULL,          -- FK → brokers.broker_id (or stub key)
  broker_company   TEXT    DEFAULT '',
  broker_name      TEXT    DEFAULT '',
  -- Load movement fields
  load_ref         TEXT    DEFAULT '',        -- broker's internal reference
  origin_city      TEXT    DEFAULT '',
  origin_state     TEXT    DEFAULT '',
  dest_city        TEXT    DEFAULT '',
  dest_state       TEXT    DEFAULT '',
  equipment_type   TEXT    DEFAULT 'DRY_VAN',
  load_type        TEXT    DEFAULT 'Full',    -- Full / Partial
  commodity        TEXT    DEFAULT '',
  total_miles      INTEGER DEFAULT 0,
  weight_lbs       INTEGER DEFAULT 0,
  rate             REAL    DEFAULT 0,
  dollars_per_mile REAL    DEFAULT 0,
  -- Document / status tracking
  doc_type         TEXT    DEFAULT 'LOAD_TENDER',  -- LOAD_TENDER | RATE_CON | BOL | POD | INVOICE
  doc_status       TEXT    DEFAULT 'SENT',         -- SENT | CONFIRMED | IN_TRANSIT | DELIVERED | INVOICED
  -- Timestamps
  activity_date    TEXT    NOT NULL,          -- date('now') — used for daily reset
  sent_at          TEXT    NOT NULL,          -- full ISO timestamp
  last_updated_at  TEXT    DEFAULT (datetime('now'))
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trucks_user        ON trucks(user_id);
CREATE INDEX IF NOT EXISTS idx_brokers_user       ON brokers(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user      ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_act_user    ON broker_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_broker_act_broker  ON broker_activity(broker_id, activity_date);
