-- Add guest_team_id column to matches table
-- This allows storing a reference to the guest team when is_guest_opponent is true
-- Note: opponent_team_id has FK to teams table, guest_team_id has FK to guest_teams table

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS guest_team_id UUID REFERENCES guest_teams(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_guest_team_id ON matches(guest_team_id);

-- Add comment
COMMENT ON COLUMN matches.guest_team_id IS 'Reference to the guest team when is_guest_opponent is TRUE. Use this instead of opponent_team_id for guest teams.';

-- Update comment for opponent_team_id to clarify usage
COMMENT ON COLUMN matches.opponent_team_id IS 'Reference to registered teams only. For guest teams use guest_team_id instead.';
