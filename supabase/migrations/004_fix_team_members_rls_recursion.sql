-- Fix infinite recursion in team_members RLS policy
-- The "Team managers can manage members" policy causes infinite recursion
-- because it queries team_members within a team_members policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Team managers can manage members" ON public.team_members;

-- Recreate policies without recursion
-- Keep SELECT open to everyone (already exists as "Anyone can view team members")

-- For INSERT/UPDATE/DELETE, use separate policies
CREATE POLICY "Team managers can insert members" ON public.team_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_members.team_id
            AND t.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'MANAGER'
            AND tm.status = 'active'
        )
    );

CREATE POLICY "Team managers can update members" ON public.team_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_members.team_id
            AND t.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'MANAGER'
            AND tm.status = 'active'
        )
    );

CREATE POLICY "Team managers can delete members" ON public.team_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_members.team_id
            AND t.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'MANAGER'
            AND tm.status = 'active'
        )
    );
