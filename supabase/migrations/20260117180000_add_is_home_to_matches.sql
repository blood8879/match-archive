-- Add is_home field to matches table
-- This allows tracking whether a match was played at home or away

ALTER TABLE matches
ADD COLUMN is_home BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN matches.is_home IS 'Whether this match was played at home (true) or away (false). Defaults to true.';
