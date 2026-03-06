# Recovery Code Setup

Run these in order in the Supabase SQL Editor.

## 1. Set up the structure (run once)

```sql
-- Recovery code for device swap: 5-char code to load character on another device
ALTER TABLE players ADD COLUMN IF NOT EXISTS recovery_code TEXT UNIQUE;

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_players_recovery_code ON players(recovery_code) WHERE recovery_code IS NOT NULL;
```

## 2. Give codes to existing players (run after step 1)

```sql
-- Generate and assign recovery codes to players who don't have one
-- Uses same character set as app: A-Z (no I,O,L) + 2-9
DO $$
DECLARE
  p RECORD;
  new_code TEXT;
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i INT;
  attempts INT;
BEGIN
  FOR p IN SELECT id FROM players WHERE recovery_code IS NULL
  LOOP
    attempts := 0;
    LOOP
      new_code := '';
      FOR i IN 1..5 LOOP
        new_code := new_code || substr(chars, floor(random() * 32 + 1)::int, 1);
      END LOOP;
      BEGIN
        UPDATE players SET recovery_code = new_code WHERE id = p.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 10 THEN
          RAISE EXCEPTION 'Could not generate unique code for player %', p.id;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;
```
