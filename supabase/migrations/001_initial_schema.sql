-- King of the Hill - Initial Database Schema
-- Run this in Supabase SQL Editor

-- Hall of Fame: Previous game winners
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id BIGSERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  player_color TEXT NOT NULL,
  final_points INTEGER NOT NULL,
  game_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms: Single room to start, max 10 players
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Main Arena',
  max_players INTEGER NOT NULL DEFAULT 10,
  game_start_time TIMESTAMPTZ,
  game_end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players in a room
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 10),
  color TEXT NOT NULL,
  class_type TEXT NOT NULL CHECK (class_type IN ('attacker', 'defender', 'balanced')),
  attack_points INTEGER NOT NULL,
  defense_points INTEGER NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 10,
  health_points INTEGER NOT NULL DEFAULT 50,
  current_item_id UUID,
  last_round_item_id UUID,
  is_eliminated BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, session_id)
);

-- Items available in the store
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL,
  attack_bonus INTEGER DEFAULT 0,
  defense_bonus INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys for items (run after items table is populated)
-- Note: If constraints exist, you may need to drop them first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_current_item') THEN
    ALTER TABLE players ADD CONSTRAINT fk_current_item FOREIGN KEY (current_item_id) REFERENCES items(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_last_round_item') THEN
    ALTER TABLE players ADD CONSTRAINT fk_last_round_item FOREIGN KEY (last_round_item_id) REFERENCES items(id);
  END IF;
END $$;

-- Attack allocations for each hour (player decisions)
CREATE TABLE IF NOT EXISTS attack_allocations (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  attacker_session_id TEXT NOT NULL,
  target_session_id TEXT NOT NULL,
  attack_points_used INTEGER NOT NULL,
  hour_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Round results log (for display in game)
CREATE TABLE IF NOT EXISTS round_results (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  hour_index INTEGER NOT NULL,
  result_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default items
INSERT INTO items (name, description, cost, attack_bonus, defense_bonus) VALUES
  ('Iron Sword', '+2 Attack', 5, 2, 0),
  ('Wooden Shield', '+2 Defense', 5, 0, 2),
  ('Battle Axe', '+3 Attack', 8, 3, 0),
  ('Steel Armor', '+3 Defense', 8, 0, 3),
  ('War Hammer', '+2 Attack, +1 Defense', 10, 2, 1),
  ('Dragon Scale', '+1 Attack, +2 Defense', 10, 1, 2),
  ('Lucky Charm', '+1 Attack, +1 Defense', 3, 1, 1);

-- Create main room (run once - ignore if exists)
INSERT INTO rooms (name, max_players) 
SELECT 'Main Arena', 10 
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name = 'Main Arena' LIMIT 1);

-- Enable RLS (Row Level Security) - allow anonymous read/write for game
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attack_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

-- Track which hours have been evaluated (prevent duplicate evaluation)
CREATE TABLE IF NOT EXISTS round_evaluations (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  hour_index INTEGER NOT NULL,
  PRIMARY KEY (room_id, hour_index)
);
ALTER TABLE round_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (using anon key)
CREATE POLICY "Allow all for hall_of_fame" ON hall_of_fame FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for round_evaluations" ON round_evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for attack_allocations" ON attack_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for round_results" ON round_results FOR ALL USING (true) WITH CHECK (true);
