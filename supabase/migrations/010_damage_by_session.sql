-- Store per-player damage taken for each round (for elimination screen debugging)
ALTER TABLE round_results ADD COLUMN IF NOT EXISTS damage_by_session JSONB;
