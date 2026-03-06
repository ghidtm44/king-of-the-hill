-- New mechanics: HP 15, classes 3/1 2/2 1/3, items Sword/Shield/Armor/Potion
-- Run after 002_simplified_combat.sql

-- Update players defaults
ALTER TABLE players ALTER COLUMN health_points SET DEFAULT 15;
ALTER TABLE players ALTER COLUMN total_points SET DEFAULT 5;

-- Cap existing players
UPDATE players SET health_points = 15 WHERE health_points > 15;

-- Ensure damage_reduction and hp_on_purchase exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS damage_reduction INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS hp_on_purchase INTEGER DEFAULT 0;

-- Clear item references
UPDATE players SET current_item_id = NULL, last_round_item_id = NULL;

-- Replace items with new set
DELETE FROM items;

INSERT INTO items (name, description, cost, attack_bonus, defense_bonus, damage_reduction, hp_on_purchase) VALUES
  ('Sword', '+1 Attack', 4, 1, 0, 0, 0),
  ('Shield', '+1 Defense', 4, 0, 1, 0, 0),
  ('Armor', 'Reduce incoming damage by 1', 6, 0, 0, 1, 0),
  ('Potion', 'Restore 5 HP immediately', 5, 0, 0, 0, 5);
