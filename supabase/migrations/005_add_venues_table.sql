-- Add venues table for home stadium management
-- Teams can register multiple venues and select them when creating matches

CREATE TABLE public.venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    address_detail TEXT,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for performance
CREATE INDEX idx_venues_team_id ON public.venues(team_id);
CREATE INDEX idx_venues_is_primary ON public.venues(team_id, is_primary);

-- Modify matches table to reference venue
ALTER TABLE public.matches ADD COLUMN venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

-- Keep location as fallback for external venues
-- location will be used for away games or non-registered venues

-- RLS Policies for venues
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venues" ON public.venues
    FOR SELECT USING (true);

CREATE POLICY "Team managers can create venues" ON public.venues
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = venues.team_id
            AND t.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = venues.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'MANAGER'
            AND tm.status = 'active'
        )
    );

CREATE POLICY "Team managers can update venues" ON public.venues
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = venues.team_id
            AND t.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = venues.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'MANAGER'
            AND tm.status = 'active'
        )
    );

CREATE POLICY "Team managers can delete venues" ON public.venues
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = venues.team_id
            AND t.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = venues.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'MANAGER'
            AND tm.status = 'active'
        )
    );

-- Function to ensure only one primary venue per team
CREATE OR REPLACE FUNCTION public.ensure_single_primary_venue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE public.venues
        SET is_primary = false
        WHERE team_id = NEW.team_id
        AND id != NEW.id
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for primary venue constraint
CREATE TRIGGER on_venue_primary_change
    BEFORE INSERT OR UPDATE ON public.venues
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION public.ensure_single_primary_venue();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_venue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER on_venue_update
    BEFORE UPDATE ON public.venues
    FOR EACH ROW
    EXECUTE FUNCTION public.update_venue_updated_at();
