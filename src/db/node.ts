/**
 * Node-only database fallback.
 *
 * Keep this file separate from `src/db/index.ts` so Edge routes never import
 * Node APIs like `process.cwd()` or native `better-sqlite3`.
 */
import Database from "better-sqlite3";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export { schema };

type DbInstance = ReturnType<typeof createLocalDb>;

let localDb: DbInstance | null = null;

function createLocalDb() {
  const dbPath = path.join(process.cwd(), "shuttle-arena.db");
  const sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

export function getDb(): DbInstance {
  if (!localDb) {
    localDb = createLocalDb();
  }

  return localDb;
}
