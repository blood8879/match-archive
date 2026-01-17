-- Fix: 용병 기록 병합 시 중복 team_member 레코드 생성 방지
-- 문제: process_record_merge 함수가 'active' 상태만 확인하여,
--       'pending' 상태의 기존 레코드가 있으면 새로운 'active' 레코드를 생성함
-- 해결: 모든 상태의 기존 레코드를 확인하고, 있으면 UPDATE로 처리

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
    v_goals_updated INTEGER := 0;
    v_assists_updated INTEGER := 0;
BEGIN
    SELECT * INTO v_request
    FROM public.record_merge_requests
    WHERE id = p_merge_request_id
    AND invitee_id = p_user_id
    AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '유효하지 않은 병합 요청입니다.'
        );
    END IF;

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

    UPDATE public.match_records
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_records_updated = ROW_COUNT;

    UPDATE public.goals
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_goals_updated = ROW_COUNT;

    UPDATE public.goals
    SET assist_member_id = v_new_member_id
    WHERE assist_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_assists_updated = ROW_COUNT;

    UPDATE public.team_members
    SET status = 'merged',
        merged_to = v_new_member_id,
        merged_at = NOW()
    WHERE id = v_request.guest_member_id;

    UPDATE public.record_merge_requests
    SET status = 'accepted',
        processed_at = NOW()
    WHERE id = p_merge_request_id;

    RETURN json_build_object(
        'success', true,
        'new_member_id', v_new_member_id,
        'records_updated', v_records_updated,
        'goals_updated', v_goals_updated,
        'assists_updated', v_assists_updated,
        'was_existing_member', v_existing_member.id IS NOT NULL
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_record_merge IS 
'용병 기록을 정규 팀원에게 병합합니다. 기존 멤버십(pending/left 포함)이 있으면 active로 업데이트하고, 없으면 새로 생성합니다.';
