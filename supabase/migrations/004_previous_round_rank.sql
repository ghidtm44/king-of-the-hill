-- Add previous_round_rank to track ranking changes
ALTER TABLE players ADD COLUMN IF NOT EXISTS previous_round_rank INTEGER;
