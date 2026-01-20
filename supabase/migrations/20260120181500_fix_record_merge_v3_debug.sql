-- Fix: 기록 병합 시 UNIQUE(match_id, team_member_id) 제약조건 위반 수정 (v3 - 디버그 버전)
-- 문제: 같은 경기에 용병/정식 멤버 기록 모두 존재할 때 UPDATE 시 UNIQUE 위반 발생
-- 해결: FOR LOOP으로 중복 경기를 먼저 처리 (통계 합산 후 용병 기록 삭제)

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
    
    -- 기존 팀 멤버 레코드 확인 (모든 상태 - active, pending, left 포함)
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
        -- 기존 레코드가 있으면 active 상태로 업데이트
        UPDATE public.team_members
        SET status = 'active',
            role = CASE WHEN role = 'OWNER' THEN 'OWNER' ELSE 'MEMBER' END,
            joined_at = COALESCE(joined_at, NOW()),
            left_at = NULL
        WHERE id = v_existing_member.id;
        
        v_new_member_id := v_existing_member.id;
    ELSE
        -- 기존 레코드가 없으면 새로 생성
        INSERT INTO public.team_members (
            team_id, user_id, role, status, is_guest, joined_at
        ) VALUES (
            v_request.team_id, p_user_id, 'MEMBER', 'active', false, NOW()
        )
        RETURNING id INTO v_new_member_id;
    END IF;

    v_debug_step := 'handle_duplicates';
    
    -- 중복 경기 처리 (같은 경기에 용병/정식 멤버 기록 모두 존재하는 경우)
    -- FOR LOOP으로 하나씩 처리하여 UNIQUE 제약조건 위반 방지
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
        -- 정식 멤버 기록에 용병 기록 통계 합산
        UPDATE public.match_records
        SET goals = goals + v_dup.guest_goals,
            assists = assists + v_dup.guest_assists,
            is_mom = is_mom OR v_dup.guest_is_mom
        WHERE id = v_dup.member_record_id;

        -- 용병 기록 삭제
        DELETE FROM public.match_records WHERE id = v_dup.guest_record_id;
        
        v_records_merged := v_records_merged + 1;
    END LOOP;

    v_debug_step := 'update_remaining_records';
    
    -- 남은 용병 기록들 (중복 아닌 것들)을 정식 멤버로 이전
    UPDATE public.match_records
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_records_updated = ROW_COUNT;

    v_debug_step := 'update_goals';
    
    -- 골 기록 업데이트
    UPDATE public.goals
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_goals_updated = ROW_COUNT;

    v_debug_step := 'update_assists';
    
    -- 어시스트 기록 업데이트
    UPDATE public.goals
    SET assist_member_id = v_new_member_id
    WHERE assist_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_assists_updated = ROW_COUNT;

    v_debug_step := 'mark_guest_merged';
    
    -- 용병 team_member를 merged 상태로 변경
    UPDATE public.team_members
    SET status = 'merged',
        merged_to = v_new_member_id,
        merged_at = NOW()
    WHERE id = v_request.guest_member_id;

    v_debug_step := 'update_merge_request';
    
    -- 병합 요청 완료 처리
    UPDATE public.record_merge_requests
    SET status = 'accepted',
        processed_at = NOW()
    WHERE id = p_merge_request_id;

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

COMMENT ON FUNCTION public.process_record_merge IS 
'용병 기록을 정규 팀원에게 병합합니다. 중복 경기 기록은 통계를 합산하고 용병 기록을 삭제합니다. (v3 - debug)';
