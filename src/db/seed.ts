/**
 * 数据库初始化脚本
 * 运行: npx tsx src/db/seed.ts
 */
import Database from "better-sqlite3";
import path from "path";
import { readFileSync } from "fs";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "shuttle-arena.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables from the canonical schema.sql (single source of truth)
const schemaPath = path.join(process.cwd(), "schema.sql");
const schemaSql = readFileSync(schemaPath, "utf-8");
sqlite.exec(schemaSql);

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
