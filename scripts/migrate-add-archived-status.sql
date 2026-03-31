-- Migration: Add 'archived' to tournaments.status CHECK constraint
-- For D1, execute this file in one request. Do not run it line-by-line
-- in the dashboard SQL console, otherwise the deferred foreign key state will not
-- be preserved for the DROP/RENAME steps.
--
--   npx wrangler d1 execute shuttle-arena-db --remote --file=scripts/migrate-add-archived-status.sql
--
--   npx wrangler d1 execute shuttle-arena-db --local --file=scripts/migrate-add-archived-status.sql

-- Remote D1 rejects explicit BEGIN/COMMIT here; each execute/import request is
-- already handled atomically on the server side.
PRAGMA defer_foreign_keys = on;

-- Clean up leftovers from a partially executed migration attempt.
DROP TABLE IF EXISTS tournaments_new;

CREATE TABLE tournaments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'finished', 'archived')),
  courts_count INTEGER NOT NULL DEFAULT 3,
  round_duration_minutes INTEGER NOT NULL DEFAULT 20,
  scoring_mode TEXT NOT NULL DEFAULT 'single_21' CHECK(scoring_mode IN ('single_21', 'single_30', 'best_of_3_15', 'best_of_3_21')),
  event_date TEXT,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '19:00',
  deuce_enabled INTEGER NOT NULL DEFAULT 1,
  males_per_group INTEGER NOT NULL DEFAULT 3,
  females_per_group INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO tournaments_new (
  id,
  name,
  status,
  courts_count,
  round_duration_minutes,
  scoring_mode,
  event_date,
  start_time,
  end_time,
  deuce_enabled,
  males_per_group,
  females_per_group,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  status,
  courts_count,
  round_duration_minutes,
  scoring_mode,
  event_date,
  start_time,
  end_time,
  deuce_enabled,
  males_per_group,
  females_per_group,
  created_at,
  updated_at
FROM tournaments;
DROP TABLE tournaments;
ALTER TABLE tournaments_new RENAME TO tournaments;
PRAGMA defer_foreign_keys = off;
