/**
 * Edge-safe database entrypoint for the app runtime.
 *
 * All API routes in this project run on the Edge runtime, both in local dev
 * (`npm run dev` with Cloudflare bindings) and on Cloudflare Pages.
 *
 * The Node.js better-sqlite3 fallback is still preserved in `src/db/node.ts`
 * for explicit Node-only tooling, but Edge routes must not import that file.
 */
import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";

export { schema };

type CloudflareEnvWithDb = CloudflareEnv & { DB: D1Database };
type DbInstance = ReturnType<typeof createD1Db>;

function getD1Binding(): D1Database {
  try {
    const { env } = getRequestContext();
    const db = (env as Partial<CloudflareEnvWithDb>)?.DB;

    if (!db) {
      throw new Error("Missing Cloudflare D1 binding.");
    }

    return db;
  } catch {
    throw new Error(
      "Cloudflare D1 binding not found. Run `npm run dev` for local D1 dev, or `npm run preview:cf` for Cloudflare preview."
    );
  }
}

function createD1Db() {
  return drizzleD1(getD1Binding(), { schema });
}

/**
 * Get a database instance.
 * - App runtime: fresh Cloudflare D1 instance per request
 */
export function getDb(): DbInstance {
  return createD1Db();
}
