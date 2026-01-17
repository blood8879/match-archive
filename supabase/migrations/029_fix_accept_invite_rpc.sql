CREATE OR REPLACE FUNCTION public.accept_team_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
    v_existing_member RECORD;
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
    
    SELECT * INTO v_existing_member
    FROM public.team_members
    WHERE team_id = v_invite.team_id
    AND user_id = v_user_id
    AND is_guest = false;
    
    IF v_existing_member IS NOT NULL THEN
        UPDATE public.team_members
        SET status = 'active'
        WHERE id = v_existing_member.id;
    ELSE
        INSERT INTO public.team_members (team_id, user_id, role, status, is_guest)
        VALUES (v_invite.team_id, v_user_id, 'MEMBER', 'active', false);
    END IF;
    
    UPDATE public.team_invites
    SET status = 'accepted'
    WHERE id = p_invite_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
