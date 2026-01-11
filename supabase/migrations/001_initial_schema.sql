-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE position_type AS ENUM ('FW', 'MF', 'DF', 'GK');
CREATE TYPE member_role AS ENUM ('OWNER', 'MANAGER', 'MEMBER');
CREATE TYPE member_status AS ENUM ('active', 'pending');
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'FINISHED', 'CANCELED');
CREATE TYPE goal_type AS ENUM ('NORMAL', 'PK', 'FREEKICK', 'OWN_GOAL');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    nickname TEXT,
    position position_type,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    emblem_url TEXT,
    region TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    member_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Team Members table (supports both real users and guests)
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    role member_role DEFAULT 'MEMBER' NOT NULL,
    status member_status DEFAULT 'pending' NOT NULL,
    is_guest BOOLEAN DEFAULT FALSE NOT NULL,
    guest_name TEXT,
    back_number INTEGER,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_member CHECK (
        (is_guest = FALSE AND user_id IS NOT NULL) OR
        (is_guest = TRUE AND guest_name IS NOT NULL)
    )
);

-- Matches table
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    opponent_name TEXT NOT NULL,
    match_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    status match_status DEFAULT 'SCHEDULED' NOT NULL,
    quarters INTEGER DEFAULT 4 NOT NULL,
    home_score INTEGER DEFAULT 0 NOT NULL,
    away_score INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Match Records table (player participation and stats per match)
CREATE TABLE public.match_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    quarters_played INTEGER DEFAULT 0 NOT NULL,
    goals INTEGER DEFAULT 0 NOT NULL,
    assists INTEGER DEFAULT 0 NOT NULL,
    is_mom BOOLEAN DEFAULT FALSE NOT NULL,
    clean_sheet BOOLEAN DEFAULT FALSE NOT NULL,
    position_played TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(match_id, team_member_id)
);

-- Goals table (detailed goal information)
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    assist_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    quarter INTEGER NOT NULL,
    type goal_type DEFAULT 'NORMAL' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_matches_team_id ON public.matches(team_id);
CREATE INDEX idx_matches_match_date ON public.matches(match_date);
CREATE INDEX idx_match_records_match_id ON public.match_records(match_id);
CREATE INDEX idx_match_records_team_member_id ON public.match_records(team_member_id);
CREATE INDEX idx_goals_match_id ON public.goals(match_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all profiles" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for teams
CREATE POLICY "Anyone can view teams" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update teams" ON public.teams
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete teams" ON public.teams
    FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for team_members
CREATE POLICY "Anyone can view team members" ON public.team_members
    FOR SELECT USING (true);

CREATE POLICY "Team managers can manage members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

CREATE POLICY "Users can request to join teams" ON public.team_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND status = 'pending' AND role = 'MEMBER'
    );

-- RLS Policies for matches
CREATE POLICY "Anyone can view matches" ON public.matches
    FOR SELECT USING (true);

CREATE POLICY "Team managers can create matches" ON public.matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = matches.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

CREATE POLICY "Team managers can update matches" ON public.matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = matches.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

-- RLS Policies for match_records
CREATE POLICY "Anyone can view match records" ON public.match_records
    FOR SELECT USING (true);

CREATE POLICY "Team managers can manage match records" ON public.match_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            JOIN public.team_members tm ON tm.team_id = m.team_id
            WHERE m.id = match_records.match_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

-- RLS Policies for goals
CREATE POLICY "Anyone can view goals" ON public.goals
    FOR SELECT USING (true);

CREATE POLICY "Team managers can manage goals" ON public.goals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            JOIN public.team_members tm ON tm.team_id = m.team_id
            WHERE m.id = goals.match_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('OWNER', 'MANAGER')
        )
    );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update team member count
CREATE OR REPLACE FUNCTION public.update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE public.teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE public.teams SET member_count = member_count - 1 WHERE id = OLD.team_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'active' THEN
        UPDATE public.teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'pending' THEN
        UPDATE public.teams SET member_count = member_count - 1 WHERE id = NEW.team_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for team member count
CREATE TRIGGER on_team_member_change
    AFTER INSERT OR UPDATE OR DELETE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION public.update_team_member_count();
