-- Items last 3 rounds. Track when acquired.
ALTER TABLE players ADD COLUMN IF NOT EXISTS item_acquired_round INTEGER;
