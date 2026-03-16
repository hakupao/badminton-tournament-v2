/**
 * Database layer - supports both local (better-sqlite3) and Cloudflare D1.
 *
 * Switch via environment variable USE_D1:
 *   - USE_D1=true  → Cloudflare D1 (via @cloudflare/next-on-pages)
 *   - otherwise    → Local better-sqlite3 (Plan B)
 *
 * All consumers use getDb() and `await` all DB operations,
 * since D1 is async. `await` on sync better-sqlite3 calls is a no-op.
 *
 * NOTE on module loading strategy:
 * - D1 modules use static import — the packages exist in node_modules and
 *   Webpack resolves them at build time. @cloudflare/next-on-pages CLI
 *   replaces the reference at post-build time with its runtime implementation.
 * - Local SQLite modules use eval('require(...)') to hide native Node.js
 *   dependencies (fs, path, better-sqlite3) from the Edge Runtime bundler.
 *   This code path is never reached in production (USE_D1=true).
 */
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";

export { schema };

type DbInstance = BetterSQLite3Database<typeof schema>;
type CloudflareEnvWithDb = CloudflareEnv & { DB: D1Database };

let _localDb: DbInstance | null = null;

function createLocalDb(): DbInstance {
  const Database = eval('require("better-sqlite3")');
  const path = eval('require("path")');
  const { drizzle } = eval('require("drizzle-orm/better-sqlite3")');

  const DB_PATH = path.join(process.cwd(), "shuttle-arena.db");
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

function createD1Db(): DbInstance {
  const { env } = getRequestContext();
  const cloudflareEnv = env as CloudflareEnvWithDb;
  return drizzleD1(cloudflareEnv.DB, { schema }) as unknown as DbInstance;
}

/**
 * Get a database instance.
 * - Cloudflare D1: fresh instance per request
 * - Local dev: cached better-sqlite3 singleton
 */
export function getDb(): DbInstance {
  if (process.env.USE_D1 === "true") {
    return createD1Db();
  }
  if (!_localDb) {
    _localDb = createLocalDb();
  }
  return _localDb;
}
