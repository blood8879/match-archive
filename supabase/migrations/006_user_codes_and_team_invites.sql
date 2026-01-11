-- Add user_code to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;

-- Create index for user_code lookups
CREATE INDEX IF NOT EXISTS idx_users_user_code ON public.users(user_code);

-- Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(team_id, invitee_id)
);

-- Create indexes for team_invites
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_inviter_id ON public.team_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_invitee_id ON public.team_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON public.team_invites(status);

-- Enable RLS on team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_invites

-- Anyone can view invites they're involved in (as inviter or invitee)
DROP POLICY IF EXISTS "Users can view their invites" ON public.team_invites;
CREATE POLICY "Users can view their invites" ON public.team_invites
FOR SELECT USING (
    auth.uid() = inviter_id OR auth.uid() = invitee_id
);

-- Team managers can create invites
DROP POLICY IF EXISTS "Team managers can create invites" ON public.team_invites;
CREATE POLICY "Team managers can create invites" ON public.team_invites
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_invites.team_id
        AND user_id = auth.uid()
        AND role IN ('OWNER', 'MANAGER')
        AND status = 'active'
    )
);

-- Invitees can update their own invites (accept/reject)
DROP POLICY IF EXISTS "Invitees can update their invites" ON public.team_invites;
CREATE POLICY "Invitees can update their invites" ON public.team_invites
FOR UPDATE USING (
    auth.uid() = invitee_id
);

-- Team managers can delete invites
DROP POLICY IF EXISTS "Team managers can delete invites" ON public.team_invites;
CREATE POLICY "Team managers can delete invites" ON public.team_invites
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_invites.team_id
        AND user_id = auth.uid()
        AND role IN ('OWNER', 'MANAGER')
        AND status = 'active'
    )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_team_invite_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_team_invite_update ON public.team_invites;
CREATE TRIGGER on_team_invite_update
    BEFORE UPDATE ON public.team_invites
    FOR EACH ROW EXECUTE FUNCTION public.update_team_invite_timestamp();

-- Function to generate unique user code
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-character alphanumeric code (uppercase)
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));

        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM public.users WHERE user_code = new_code) INTO code_exists;

        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate user_code for existing users without one
CREATE OR REPLACE FUNCTION public.ensure_user_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_code IS NULL THEN
        NEW.user_code := public.generate_user_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate user_code on user creation
DROP TRIGGER IF EXISTS on_user_insert_generate_code ON public.users;
CREATE TRIGGER on_user_insert_generate_code
    BEFORE INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_user_code();

-- Backfill user_code for existing users
UPDATE public.users
SET user_code = public.generate_user_code()
WHERE user_code IS NULL;
