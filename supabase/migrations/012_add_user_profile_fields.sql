-- Add additional profile fields to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS preferred_position TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for updated_at
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.preferred_position IS 'User preferred playing position (FW, MF, DF, GK)';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.is_public IS 'Whether user profile is public';
COMMENT ON COLUMN users.email_notifications IS 'Whether user wants to receive email notifications';
COMMENT ON COLUMN users.updated_at IS 'Timestamp of last profile update';
