-- Simplified combat: Score 5, HP 20, new items
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- Update players default values (for new players)
ALTER TABLE players ALTER COLUMN total_points SET DEFAULT 5;
ALTER TABLE players ALTER COLUMN health_points SET DEFAULT 20;

-- Cap existing players with old 50 HP to 20
UPDATE players SET health_points = 20 WHERE health_points > 20;

-- Add new columns to items for Potion and Trap
ALTER TABLE items ADD COLUMN IF NOT EXISTS damage_reduction INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS hp_on_purchase INTEGER DEFAULT 0;

-- Clear item references (so we can replace items)
UPDATE players SET current_item_id = NULL, last_round_item_id = NULL;

-- Replace items with simplified set
DELETE FROM items;

INSERT INTO items (name, description, cost, attack_bonus, defense_bonus, damage_reduction, hp_on_purchase) VALUES
  ('Weapon', '+2 Attack', 4, 2, 0, 0, 0),
  ('Shield', '+2 Defense', 4, 0, 2, 0, 0),
  ('Potion', '+5 HP instantly', 5, 0, 0, 0, 5),
  ('Trap', 'Reduce damage by 2', 6, 0, 0, 2, 0);
