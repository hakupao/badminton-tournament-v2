-- Migration: Add deuce_enabled to tournaments table for configurable deuce rule
-- Run: npx wrangler d1 execute shuttle-arena-db --remote --file=migrations/002_add_deuce_enabled.sql

ALTER TABLE tournaments ADD COLUMN deuce_enabled INTEGER NOT NULL DEFAULT 1;
