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

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trucks_user   ON trucks(user_id);
CREATE INDEX IF NOT EXISTS idx_brokers_user  ON brokers(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
