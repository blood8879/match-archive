-- Migration: Add user profile preference fields
-- Description: Add preferred_times, soccer_experience, and play_style_tags to users table

-- Add new profile preference fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_times TEXT[],
ADD COLUMN IF NOT EXISTS soccer_experience TEXT,
ADD COLUMN IF NOT EXISTS play_style_tags TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN users.preferred_times IS 'User preferred playing times (e.g., ["주말 오전", "평일 저녁"])';
COMMENT ON COLUMN users.soccer_experience IS 'User soccer experience description (e.g., "대학 축구부 3년")';
COMMENT ON COLUMN users.play_style_tags IS 'User play style tags (e.g., ["빌드업형", "투쟁형"])';
