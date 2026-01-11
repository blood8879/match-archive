-- Add attendance status type
CREATE TYPE attendance_status AS ENUM ('attending', 'maybe', 'absent');

-- Match attendance tracking
CREATE TABLE public.match_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'maybe',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(match_id, team_member_id)
);

-- Team invite links with expiry
CREATE TABLE public.team_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    code VARCHAR(32) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0 NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_match_attendance_match ON public.match_attendance(match_id);
CREATE INDEX idx_match_attendance_member ON public.match_attendance(team_member_id);
CREATE INDEX idx_team_invites_code ON public.team_invites(code);
CREATE INDEX idx_team_invites_team ON public.team_invites(team_id);

-- Enable RLS
ALTER TABLE public.match_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_attendance
CREATE POLICY "Anyone can view match attendance" ON public.match_attendance
    FOR SELECT USING (true);

CREATE POLICY "Team members can update own attendance" ON public.match_attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            JOIN public.matches m ON m.team_id = tm.team_id
            WHERE tm.id = match_attendance.team_member_id
            AND m.id = match_attendance.match_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update own attendance status" ON public.match_attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = match_attendance.team_member_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team managers can manage all attendance" ON public.match_attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            JOIN public.team_members tm ON tm.team_id = m.team_id
            WHERE m.id = match_attendance.match_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

-- RLS Policies for team_invites
CREATE POLICY "Anyone can view valid invites" ON public.team_invites
    FOR SELECT USING (true);

CREATE POLICY "Team managers can create invites" ON public.team_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_invites.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

CREATE POLICY "Team managers can manage invites" ON public.team_invites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_invites.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

-- Function to auto-update attendance timestamp
CREATE OR REPLACE FUNCTION public.update_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_attendance_update
    BEFORE UPDATE ON public.match_attendance
    FOR EACH ROW EXECUTE FUNCTION public.update_attendance_timestamp();
