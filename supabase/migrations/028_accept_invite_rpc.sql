CREATE OR REPLACE FUNCTION public.accept_team_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    SELECT * INTO v_invite
    FROM public.team_invites
    WHERE id = p_invite_id
    AND invitee_id = v_user_id
    AND status = 'pending';
    
    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invite';
    END IF;
    
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (v_invite.team_id, v_user_id, 'MEMBER', 'active')
    ON CONFLICT (team_id, user_id) DO UPDATE SET status = 'active';
    
    UPDATE public.team_invites
    SET status = 'accepted'
    WHERE id = p_invite_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.accept_team_invite(UUID) TO authenticated;
