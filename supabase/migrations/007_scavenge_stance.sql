-- Scavenge: once per round, random outcome
CREATE TABLE IF NOT EXISTS scavenge_uses (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  hour_index INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('coins', 'treasure', 'nothing', 'ambushed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, session_id, hour_index)
);
ALTER TABLE scavenge_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for scavenge_uses" ON scavenge_uses FOR ALL USING (true) WITH CHECK (true);

-- Stance: per round choice (aggressive/defensive/greedy)
CREATE TABLE IF NOT EXISTS player_stances (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  hour_index INTEGER NOT NULL,
  stance TEXT NOT NULL CHECK (stance IN ('aggressive', 'defensive', 'greedy')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, session_id, hour_index)
);
ALTER TABLE player_stances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for player_stances" ON player_stances FOR ALL USING (true) WITH CHECK (true);
