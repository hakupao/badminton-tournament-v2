-- Migration: Add slot_index to players table for dual-player position sharing
-- Run: npx wrangler d1 execute shuttle-arena-db --remote --file=migrations/001_add_slot_index.sql

ALTER TABLE players ADD COLUMN slot_index INTEGER NOT NULL DEFAULT 1;
