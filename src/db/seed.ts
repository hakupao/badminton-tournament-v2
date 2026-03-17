/**
 * 数据库初始化脚本
 * 运行: npx tsx src/db/seed.ts
 */
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "shuttle-arena.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables manually (since we might not have migrations yet)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'athlete' CHECK(role IN ('admin', 'athlete')),
    player_id INTEGER REFERENCES players(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'finished')),
    courts_count INTEGER NOT NULL DEFAULT 3,
    round_duration_minutes INTEGER NOT NULL DEFAULT 20,
    scoring_mode TEXT NOT NULL DEFAULT 'single_21' CHECK(scoring_mode IN ('single_21', 'single_30', 'best_of_3_15', 'best_of_3_21')),
    event_date TEXT,
    start_time TEXT DEFAULT '09:00',
    end_time TEXT DEFAULT '19:00',
    males_per_group INTEGER NOT NULL DEFAULT 3,
    females_per_group INTEGER NOT NULL DEFAULT 2,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    position_number INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('M', 'F')),
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS template_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
    position_number INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('M', 'F'))
  );

  CREATE TABLE IF NOT EXISTS template_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
    match_type TEXT NOT NULL CHECK(match_type IN ('MD', 'WD', 'XD')),
    home_pos_1 INTEGER NOT NULL,
    home_pos_2 INTEGER NOT NULL,
    away_pos_1 INTEGER NOT NULL,
    away_pos_2 INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
    round_number INTEGER NOT NULL,
    court_number INTEGER NOT NULL,
    home_group_id INTEGER NOT NULL REFERENCES groups(id),
    away_group_id INTEGER NOT NULL REFERENCES groups(id),
    template_match_id INTEGER REFERENCES template_matches(id),
    match_type TEXT NOT NULL CHECK(match_type IN ('MD', 'WD', 'XD')),
    home_player_1_id INTEGER REFERENCES players(id),
    home_player_2_id INTEGER REFERENCES players(id),
    away_player_1_id INTEGER REFERENCES players(id),
    away_player_2_id INTEGER REFERENCES players(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'finished')),
    winner TEXT CHECK(winner IN ('home', 'away')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS match_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    game_number INTEGER NOT NULL,
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    winner TEXT CHECK(winner IN ('home', 'away'))
  );

  CREATE TABLE IF NOT EXISTS referee_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    role TEXT NOT NULL CHECK(role IN ('referee', 'line_judge')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS score_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    game_number INTEGER NOT NULL,
    event_order INTEGER NOT NULL,
    scoring_side TEXT NOT NULL CHECK(scoring_side IN ('home', 'away')),
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tournament_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    assigned_position INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('M', 'F')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Create default admin account
const adminPassword = bcrypt.hashSync("admin123", 10);
const existingAdmin = sqlite.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (existingAdmin) {
  sqlite.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE username = 'admin'").run(adminPassword);
  console.log("✅ Admin account updated (username: admin, password: admin123)");
} else {
  sqlite.prepare("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')").run(adminPassword);
  console.log("✅ Admin account created (username: admin, password: admin123)");
}

console.log("✅ Database initialized at", DB_PATH);
sqlite.close();
