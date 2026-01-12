-- Create guest_teams table for managing unregistered opponent teams
-- Each team can maintain their own list of guest teams they've played against

CREATE TABLE IF NOT EXISTS guest_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region TEXT,
  emblem_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate guest team names within the same team
  CONSTRAINT unique_team_guest_name UNIQUE(team_id, name)
);

-- Add index for faster lookups
CREATE INDEX idx_guest_teams_team_id ON guest_teams(team_id);
CREATE INDEX idx_guest_teams_name ON guest_teams(name);

-- Add RLS policies
ALTER TABLE guest_teams ENABLE ROW LEVEL SECURITY;

-- Allow team members to view their team's guest teams
CREATE POLICY "Team members can view guest teams"
  ON guest_teams
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Allow team managers/owners to insert guest teams
CREATE POLICY "Team managers can insert guest teams"
  ON guest_teams
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Allow team managers/owners to update guest teams
CREATE POLICY "Team managers can update guest teams"
  ON guest_teams
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Allow team managers/owners to delete guest teams
CREATE POLICY "Team managers can delete guest teams"
  ON guest_teams
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Add column to matches table to distinguish between registered teams and guest teams
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_guest_opponent BOOLEAN DEFAULT FALSE;

-- Add index for filtering guest opponents
CREATE INDEX IF NOT EXISTS idx_matches_is_guest_opponent ON matches(is_guest_opponent);

-- Add comment to clarify the relationship
COMMENT ON TABLE guest_teams IS 'Stores unregistered opponent teams that each team has played against';
COMMENT ON COLUMN matches.is_guest_opponent IS 'TRUE if opponent_team_id references guest_teams, FALSE if it references teams';
COMMENT ON COLUMN matches.opponent_team_id IS 'Can reference either teams.id or guest_teams.id depending on is_guest_opponent flag';
