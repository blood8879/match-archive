-- Migration: Update create_team_with_owner to support emblem_url
-- This allows teams to be created with an emblem image

DROP FUNCTION IF EXISTS public.create_team_with_owner(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
    p_name TEXT,
    p_region TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL,
    p_emblem_url TEXT DEFAULT NULL
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

    -- Create team with emblem_url
    INSERT INTO public.teams (name, region, owner_id, code, emblem_url)
    VALUES (p_name, p_region, v_user_id, COALESCE(p_code, substr(md5(random()::text), 1, 8)), p_emblem_url)
    RETURNING * INTO v_team;

    -- Add owner as first member (bypasses RLS due to SECURITY DEFINER)
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (v_team.id, v_user_id, 'OWNER', 'active');

    RETURN v_team;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_team_with_owner(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_team_with_owner IS
'Atomically creates a team with optional emblem and adds the creator as the owner member.
Uses SECURITY DEFINER to bypass RLS policies for the team_members insert.';
