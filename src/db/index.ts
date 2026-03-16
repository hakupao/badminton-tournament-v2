/**
 * Database layer - prefers Cloudflare D1 when a `DB` binding is available
 * and falls back to local better-sqlite3 only in non-Edge Node.js contexts.
 *
 * In local development, `next.config.ts` enables Cloudflare-style bindings
 * when `npm run dev` sets `USE_D1=true`, so API routes use the local D1
 * instance managed by Wrangler. Cloudflare Pages/Workers use the real D1
 * binding at runtime.
 *
 * All consumers use getDb() and `await` all DB operations,
 * since D1 is async. `await` on sync better-sqlite3 calls is a no-op.
 *
 * NOTE on module loading strategy:
 * - D1 modules use static import — the packages exist in node_modules and
 *   Webpack resolves them at build time. Cloudflare runtime wiring provides
 *   the actual `DB` binding when available.
 * - Local SQLite modules use eval('require(...)') to hide native Node.js
 *   dependencies (fs, path, better-sqlite3) from the Edge Runtime bundler.
 *   This code path is only reached outside Edge runtimes when no D1 binding
 *   is available.
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
  const cwd = eval("process.cwd()");

  const DB_PATH = path.join(cwd, "shuttle-arena.db");
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

function hasCloudflareD1Binding() {
  try {
    const { env } = getRequestContext();
    return Boolean((env as Partial<CloudflareEnvWithDb>)?.DB);
  } catch {
    return false;
  }
}

function isEdgeRuntimeWithoutD1() {
  return typeof globalThis !== "undefined" && "EdgeRuntime" in globalThis;
}

/**
 * Get a database instance.
 * - Cloudflare D1: fresh instance per request
 * - Local dev: cached better-sqlite3 singleton
 */
export function getDb(): DbInstance {
  if (hasCloudflareD1Binding()) {
    return createD1Db();
  }
  if (isEdgeRuntimeWithoutD1()) {
    throw new Error(
      "Cloudflare D1 binding not found in Edge runtime. Run `npm run dev` for local D1 dev, or `npm run preview:cf` for Cloudflare preview."
    );
  }
  if (!_localDb) {
    _localDb = createLocalDb();
  }
  return _localDb;
}
