CREATE OR REPLACE FUNCTION public.process_direct_merge(
    p_team_id UUID,
    p_guest_member_id UUID,
    p_target_user_id UUID,
    p_manager_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_existing_member RECORD;
    v_new_member_id UUID;
    v_records_updated INTEGER := 0;
    v_records_merged INTEGER := 0;
    v_goals_updated INTEGER := 0;
    v_assists_updated INTEGER := 0;
    v_guest_member RECORD;
    v_dup RECORD;
BEGIN
    SELECT * INTO v_guest_member
    FROM public.team_members
    WHERE id = p_guest_member_id
    AND team_id = p_team_id
    AND is_guest = true
    AND status != 'merged';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '유효하지 않은 용병 기록입니다.'
        );
    END IF;

    SELECT id, status INTO v_existing_member
    FROM public.team_members
    WHERE team_id = p_team_id
    AND user_id = p_target_user_id
    AND is_guest = false
    AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '대상 사용자가 팀의 활성 멤버가 아닙니다. 병합 요청을 사용하세요.'
        );
    END IF;

    v_new_member_id := v_existing_member.id;

    FOR v_dup IN
        SELECT 
            gr.id as guest_record_id, 
            gr.match_id, 
            gr.goals as guest_goals, 
            gr.assists as guest_assists, 
            gr.is_mom as guest_is_mom,
            mr.id as member_record_id
        FROM public.match_records gr
        INNER JOIN public.match_records mr 
            ON gr.match_id = mr.match_id 
            AND mr.team_member_id = v_new_member_id
        WHERE gr.team_member_id = p_guest_member_id
    LOOP
        UPDATE public.match_records
        SET goals = goals + v_dup.guest_goals,
            assists = assists + v_dup.guest_assists,
            is_mom = is_mom OR v_dup.guest_is_mom
        WHERE id = v_dup.member_record_id;

        DELETE FROM public.match_records WHERE id = v_dup.guest_record_id;
        
        v_records_merged := v_records_merged + 1;
    END LOOP;

    UPDATE public.match_records
    SET team_member_id = v_new_member_id
    WHERE team_member_id = p_guest_member_id;

    GET DIAGNOSTICS v_records_updated = ROW_COUNT;

    UPDATE public.goals
    SET team_member_id = v_new_member_id
    WHERE team_member_id = p_guest_member_id;

    GET DIAGNOSTICS v_goals_updated = ROW_COUNT;

    UPDATE public.goals
    SET assist_member_id = v_new_member_id
    WHERE assist_member_id = p_guest_member_id;

    GET DIAGNOSTICS v_assists_updated = ROW_COUNT;

    UPDATE public.team_members
    SET status = 'merged',
        merged_to = v_new_member_id,
        merged_at = NOW()
    WHERE id = p_guest_member_id;

    INSERT INTO public.record_merge_requests (
        team_id,
        guest_member_id,
        inviter_id,
        invitee_id,
        status,
        processed_at,
        merged_by
    ) VALUES (
        p_team_id,
        p_guest_member_id,
        p_manager_id,
        p_target_user_id,
        'accepted',
        NOW(),
        p_manager_id
    )
    ON CONFLICT (guest_member_id, invitee_id) DO UPDATE
    SET status = 'accepted',
        processed_at = NOW(),
        merged_by = p_manager_id;

    PERFORM public.check_all_badges_for_user(p_target_user_id);

    RETURN json_build_object(
        'success', true,
        'target_member_id', v_new_member_id,
        'records_updated', v_records_updated,
        'records_merged', v_records_merged,
        'goals_updated', v_goals_updated,
        'assists_updated', v_assists_updated
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
