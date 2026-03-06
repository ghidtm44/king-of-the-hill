-- Increase max players from 10 to 25
UPDATE rooms SET max_players = 25 WHERE max_players = 10;
