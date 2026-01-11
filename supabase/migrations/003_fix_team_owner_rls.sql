-- Migration: Fix team owner not added to team_members
-- Issue: When creating a team, the owner cannot be added to team_members
-- because the RLS policy requires the user to already be an OWNER/MANAGER
-- 
-- Root Cause: Circular dependency in RLS policies
-- - "Team managers can manage members" checks if user is already OWNER/MANAGER
-- - "Users can request to join teams" only allows role='MEMBER' and status='pending'
-- - Neither policy allows a team owner to insert themselves with role='OWNER'

-- Solution 1: Add policy for team owners to add themselves as the first member
-- This allows the owner_id from the teams table to insert themselves into team_members
CREATE POLICY "Team owner can add self as first member" ON public.team_members
    FOR INSERT WITH CHECK (
        -- The user is inserting themselves
        user_id = auth.uid()
        -- And they are the owner of the team
        AND EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_id
            AND t.owner_id = auth.uid()
        )
        -- And they have OWNER role (this is for the owner's first insertion)
        AND role = 'OWNER'
        AND status = 'active'
    );

-- Solution 2 (Alternative): Use a database function for atomic team creation
-- This function runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.create_team_with_owner(
    p_name TEXT,
    p_region TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL
)
RETURNS public.teams AS $$
DECLARE
    v_team public.teams;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Create team
    INSERT INTO public.teams (name, region, owner_id, code)
    VALUES (p_name, p_region, v_user_id, COALESCE(p_code, substr(md5(random()::text), 1, 8)))
    RETURNING * INTO v_team;
    
    -- Add owner as first member (bypasses RLS due to SECURITY DEFINER)
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (v_team.id, v_user_id, 'OWNER', 'active');
    
    RETURN v_team;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_team_with_owner(TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_team_with_owner IS 
'Atomically creates a team and adds the creator as the owner member. 
Uses SECURITY DEFINER to bypass RLS policies for the team_members insert.';
