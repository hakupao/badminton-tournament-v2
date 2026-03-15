/**
 * Database layer - supports both local (better-sqlite3) and Cloudflare D1.
 *
 * Switch via environment variable USE_D1:
 *   - USE_D1=true  → Cloudflare D1 (via @cloudflare/next-on-pages)
 *   - otherwise    → Local better-sqlite3 (Plan B)
 *
 * All consumers use getDb() and `await` all DB operations,
 * since D1 is async. `await` on sync better-sqlite3 calls is a no-op.
 */
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export { schema };

type DbInstance = BetterSQLite3Database<typeof schema>;

let _localDb: DbInstance | null = null;

function createLocalDb(): DbInstance {
  // Dynamic require to prevent Cloudflare from bundling native modules
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/better-sqlite3");

  const DB_PATH = path.join(process.cwd(), "shuttle-arena.db");
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

function createD1Db(): DbInstance {
  // Use eval to hide module names from Turbopack's static analysis
  // These modules only exist in the Cloudflare runtime
  // eslint-disable-next-line no-eval
  const { getRequestContext } = eval('require("@cloudflare/next-on-pages")');
  // eslint-disable-next-line no-eval
  const { drizzle } = eval('require("drizzle-orm/d1")');

  const { env } = getRequestContext();
  return drizzle(env.DB, { schema });
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
