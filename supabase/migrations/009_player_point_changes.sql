-- Store per-player point changes for each round (for recap display)
ALTER TABLE round_results ADD COLUMN IF NOT EXISTS player_point_changes JSONB;
