-- Clear all game tables for fresh start
-- Run this in Supabase SQL Editor when you're ready for real players
-- WARNING: This deletes ALL game data (players, rounds, hall of fame, etc.)
-- Run migration 008_recovery_code.sql first if you haven't already.

-- Clear in dependency order (child tables first)
TRUNCATE TABLE attack_allocations CASCADE;
TRUNCATE TABLE round_results CASCADE;
TRUNCATE TABLE round_evaluations CASCADE;
TRUNCATE TABLE scavenge_uses CASCADE;
TRUNCATE TABLE player_stances CASCADE;
TRUNCATE TABLE players CASCADE;
TRUNCATE TABLE hall_of_fame CASCADE;
TRUNCATE TABLE rooms CASCADE;
TRUNCATE TABLE items CASCADE;

-- Reseed Main Arena (max 25 players)
INSERT INTO rooms (name, max_players) VALUES ('Main Arena', 25);

-- Reseed items (Sword, Shield, Armor, Potion)
INSERT INTO items (name, description, cost, attack_bonus, defense_bonus, damage_reduction, hp_on_purchase) VALUES
  ('Sword', '+1 Attack', 4, 1, 0, 0, 0),
  ('Shield', '+1 Defense', 4, 0, 1, 0, 0),
  ('Armor', 'Reduce incoming damage by 1', 6, 0, 0, 1, 0),
  ('Potion', 'Restore 5 HP immediately', 5, 0, 0, 0, 5);
