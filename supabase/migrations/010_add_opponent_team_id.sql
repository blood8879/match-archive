-- Add opponent_team_id column to matches table
-- This allows storing a reference to the opponent team if they are registered in the system

ALTER TABLE matches
ADD COLUMN opponent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_matches_opponent_team_id ON matches(opponent_team_id);

-- Add comment
COMMENT ON COLUMN matches.opponent_team_id IS 'Reference to the opponent team if they are registered in the system. If null, only opponent_name is used.';
