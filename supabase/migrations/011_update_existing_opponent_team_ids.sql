-- Update existing matches to link opponent_team_id based on opponent_name
-- This migration matches opponent_name with team names and updates the foreign key

UPDATE matches m
SET opponent_team_id = t.id
FROM teams t
WHERE
  m.opponent_team_id IS NULL
  AND LOWER(TRIM(m.opponent_name)) = LOWER(TRIM(t.name))
  AND m.opponent_name IS NOT NULL
  AND m.opponent_name != '';

-- Add a comment to track the migration
COMMENT ON COLUMN matches.opponent_team_id IS 'Foreign key to teams table for registered opponent teams. Updated via migration 011 to match existing opponent_name values.';
