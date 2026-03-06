-- Recovery code for device swap: 5-char code to load character on another device
ALTER TABLE players ADD COLUMN IF NOT EXISTS recovery_code TEXT UNIQUE;

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_players_recovery_code ON players(recovery_code) WHERE recovery_code IS NOT NULL;
