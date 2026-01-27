CREATE OR REPLACE FUNCTION public.check_all_badges_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_goals INTEGER;
    v_total_assists INTEGER;
    v_total_matches INTEGER;
    v_total_mom INTEGER;
    v_account_age_days INTEGER;
    v_team RECORD;
    v_match RECORD;
BEGIN
    SELECT
        COALESCE(SUM(mr.goals), 0),
        COALESCE(SUM(mr.assists), 0),
        COUNT(DISTINCT mr.match_id),
        COALESCE(SUM(CASE WHEN mr.is_mom THEN 1 ELSE 0 END), 0)
    INTO v_total_goals, v_total_assists, v_total_matches, v_total_mom
    FROM public.match_records mr
    JOIN public.team_members tm ON tm.id = mr.team_member_id
    JOIN public.matches m ON m.id = mr.match_id
    WHERE tm.user_id = p_user_id AND tm.is_guest = FALSE AND m.status = 'FINISHED';

    IF v_total_goals >= 1 THEN
        PERFORM public.award_badge(p_user_id, 'first_goal',
            jsonb_build_object('total_goals', v_total_goals));
    END IF;

    IF v_total_assists >= 1 THEN
        PERFORM public.award_badge(p_user_id, 'first_assist',
            jsonb_build_object('total_assists', v_total_assists));
    END IF;

    IF v_total_mom >= 1 THEN
        PERFORM public.award_badge(p_user_id, 'first_mom',
            jsonb_build_object('total_mom', v_total_mom));
    END IF;

    IF v_total_matches >= 100 THEN
        PERFORM public.award_badge(p_user_id, 'matches_100',
            jsonb_build_object('total_matches', v_total_matches));
    END IF;
    IF v_total_matches >= 50 THEN
        PERFORM public.award_badge(p_user_id, 'matches_50',
            jsonb_build_object('total_matches', v_total_matches));
    END IF;
    IF v_total_matches >= 10 THEN
        PERFORM public.award_badge(p_user_id, 'matches_10',
            jsonb_build_object('total_matches', v_total_matches));
    END IF;

    IF v_total_goals >= 50 THEN
        PERFORM public.award_badge(p_user_id, 'goals_50',
            jsonb_build_object('total_goals', v_total_goals));
    END IF;
    IF v_total_goals >= 10 THEN
        PERFORM public.award_badge(p_user_id, 'goals_10',
            jsonb_build_object('total_goals', v_total_goals));
    END IF;

    IF v_total_assists >= 50 THEN
        PERFORM public.award_badge(p_user_id, 'assists_50',
            jsonb_build_object('total_assists', v_total_assists));
    END IF;
    IF v_total_assists >= 10 THEN
        PERFORM public.award_badge(p_user_id, 'assists_10',
            jsonb_build_object('total_assists', v_total_assists));
    END IF;

    FOR v_match IN
        SELECT DISTINCT mr.match_id, mr.goals
        FROM public.match_records mr
        JOIN public.team_members tm ON tm.id = mr.team_member_id
        JOIN public.matches m ON m.id = mr.match_id
        WHERE tm.user_id = p_user_id AND tm.is_guest = FALSE AND m.status = 'FINISHED'
        AND mr.goals >= 3
    LOOP
        IF v_match.goals >= 4 THEN
            PERFORM public.award_badge(p_user_id, 'poker',
                jsonb_build_object('match_id', v_match.match_id, 'goals', v_match.goals));
        END IF;
        IF v_match.goals >= 3 THEN
            PERFORM public.award_badge(p_user_id, 'hat_trick',
                jsonb_build_object('match_id', v_match.match_id, 'goals', v_match.goals));
        END IF;
    END LOOP;

    PERFORM public.check_and_award_streak_badges(p_user_id);

    FOR v_team IN
        SELECT DISTINCT tm.team_id
        FROM public.team_members tm
        WHERE tm.user_id = p_user_id AND tm.is_guest = FALSE AND tm.status = 'active'
    LOOP
        PERFORM public.check_iron_man_badge(p_user_id, v_team.team_id);
    END LOOP;

    SELECT DATE_PART('day', NOW() - u.created_at) INTO v_account_age_days
    FROM public.users u
    WHERE u.id = p_user_id;

    IF v_account_age_days >= 730 THEN
        PERFORM public.award_badge(p_user_id, 'veteran_2year',
            jsonb_build_object('account_age_days', v_account_age_days));
    END IF;
    IF v_account_age_days >= 365 THEN
        PERFORM public.award_badge(p_user_id, 'veteran_1year',
            jsonb_build_object('account_age_days', v_account_age_days));
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_record_merge(
    p_merge_request_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_existing_member RECORD;
    v_new_member_id UUID;
    v_records_updated INTEGER := 0;
    v_records_merged INTEGER := 0;
    v_goals_updated INTEGER := 0;
    v_assists_updated INTEGER := 0;
    v_dup RECORD;
    v_debug_step TEXT := 'init';
BEGIN
    v_debug_step := 'fetch_request';
    
    SELECT * INTO v_request
    FROM public.record_merge_requests
    WHERE id = p_merge_request_id
    AND invitee_id = p_user_id
    AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '유효하지 않은 병합 요청입니다.',
            'debug_step', v_debug_step
        );
    END IF;

    v_debug_step := 'find_existing_member';
    
    SELECT id, status INTO v_existing_member
    FROM public.team_members
    WHERE team_id = v_request.team_id
    AND user_id = p_user_id
    AND is_guest = false
    ORDER BY 
        CASE status 
            WHEN 'active' THEN 1 
            WHEN 'pending' THEN 2 
            WHEN 'left' THEN 3 
            ELSE 4 
        END
    LIMIT 1;

    v_debug_step := 'create_or_update_member';
    
    IF v_existing_member.id IS NOT NULL THEN
        UPDATE public.team_members
        SET status = 'active'::member_status,
            role = CASE WHEN role = 'OWNER'::member_role THEN 'OWNER'::member_role ELSE 'MEMBER'::member_role END,
            joined_at = COALESCE(joined_at, NOW()),
            left_at = NULL
        WHERE id = v_existing_member.id;
        
        v_new_member_id := v_existing_member.id;
    ELSE
        INSERT INTO public.team_members (
            team_id, user_id, role, status, is_guest, joined_at
        ) VALUES (
            v_request.team_id, p_user_id, 'MEMBER'::member_role, 'active'::member_status, false, NOW()
        )
        RETURNING id INTO v_new_member_id;
    END IF;

    v_debug_step := 'handle_duplicates';
    
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
        WHERE gr.team_member_id = v_request.guest_member_id
    LOOP
        UPDATE public.match_records
        SET goals = goals + v_dup.guest_goals,
            assists = assists + v_dup.guest_assists,
            is_mom = is_mom OR v_dup.guest_is_mom
        WHERE id = v_dup.member_record_id;

        DELETE FROM public.match_records WHERE id = v_dup.guest_record_id;
        
        v_records_merged := v_records_merged + 1;
    END LOOP;

    v_debug_step := 'update_remaining_records';
    
    UPDATE public.match_records
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_records_updated = ROW_COUNT;

    v_debug_step := 'update_goals';
    
    UPDATE public.goals
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_goals_updated = ROW_COUNT;

    v_debug_step := 'update_assists';
    
    UPDATE public.goals
    SET assist_member_id = v_new_member_id
    WHERE assist_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_assists_updated = ROW_COUNT;

    v_debug_step := 'mark_guest_merged';
    
    UPDATE public.team_members
    SET status = 'merged'::member_status,
        merged_to = v_new_member_id,
        merged_at = NOW()
    WHERE id = v_request.guest_member_id;

    v_debug_step := 'update_merge_request';
    
    UPDATE public.record_merge_requests
    SET status = 'accepted',
        processed_at = NOW()
    WHERE id = p_merge_request_id;

    v_debug_step := 'check_badges';
    
    PERFORM public.check_all_badges_for_user(p_user_id);

    v_debug_step := 'done';
    
    RETURN json_build_object(
        'success', true,
        'new_member_id', v_new_member_id,
        'records_updated', v_records_updated,
        'records_merged', v_records_merged,
        'goals_updated', v_goals_updated,
        'assists_updated', v_assists_updated,
        'was_existing_member', v_existing_member.id IS NOT NULL,
        'debug_step', v_debug_step
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_detail', SQLSTATE,
        'debug_step', v_debug_step,
        'guest_member_id', v_request.guest_member_id,
        'new_member_id', v_new_member_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
