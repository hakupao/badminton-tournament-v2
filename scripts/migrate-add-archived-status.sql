-- Migration: Add 'archived' to tournaments.status CHECK constraint
--
-- For REMOTE D1 (Cloudflare):
--   npx wrangler d1 execute shuttle-arena-db --remote --command "PRAGMA foreign_keys = OFF"
--   npx wrangler d1 execute shuttle-arena-db --remote --file=scripts/migrate-add-archived-status.sql
--   npx wrangler d1 execute shuttle-arena-db --remote --command "PRAGMA foreign_keys = ON"
--
-- For LOCAL development (use sqlite3 directly):
--   sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<DB_FILE>.sqlite < scripts/migrate-add-archived-status.sql
--
-- SQLite does not support ALTER COLUMN to modify CHECK constraints.
-- We must recreate the table with the new constraint and copy data over.

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

INSERT INTO tournaments_new SELECT * FROM tournaments;
DROP TABLE tournaments;
ALTER TABLE tournaments_new RENAME TO tournaments;
