-- Fix: 기록 병합 시 같은 경기에 용병/정식 멤버 기록 모두 존재할 때 UNIQUE 제약조건 위반 수정
-- 문제: 용병으로 출전한 경기에 정식 멤버로도 출전 기록이 있으면 
--       UPDATE 시 UNIQUE(match_id, team_member_id) 위반 발생
-- 해결: 중복 경기 기록은 합산 후 용병 기록 삭제, 나머지는 기존대로 업데이트

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
BEGIN
    -- 병합 요청 조회
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

    -- 1. 중복 경기 기록 처리 (용병/정식 둘 다 같은 경기에 출전한 경우)
    -- 정식 멤버 기록에 용병 기록을 합산하고 용병 기록 삭제
    WITH duplicate_matches AS (
        SELECT gr.match_id, gr.id as guest_record_id, mr.id as member_record_id,
               gr.goals as guest_goals, gr.assists as guest_assists,
               gr.is_mom as guest_is_mom
        FROM public.match_records gr
        JOIN public.match_records mr ON gr.match_id = mr.match_id
        WHERE gr.team_member_id = v_request.guest_member_id
        AND mr.team_member_id = v_new_member_id
    ),
    update_existing AS (
        UPDATE public.match_records mr
        SET goals = mr.goals + dm.guest_goals,
            assists = mr.assists + dm.guest_assists,
            is_mom = mr.is_mom OR dm.guest_is_mom
        FROM duplicate_matches dm
        WHERE mr.id = dm.member_record_id
        RETURNING mr.id
    ),
    delete_duplicates AS (
        DELETE FROM public.match_records
        WHERE id IN (SELECT guest_record_id FROM duplicate_matches)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_records_merged FROM delete_duplicates;

    -- 2. 중복이 아닌 경기 기록은 기존대로 team_member_id 업데이트
    UPDATE public.match_records
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_records_updated = ROW_COUNT;

    -- 3. goals 테이블 업데이트 (득점자)
    UPDATE public.goals
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_goals_updated = ROW_COUNT;

    -- 4. goals 테이블 업데이트 (어시스트)
    UPDATE public.goals
    SET assist_member_id = v_new_member_id
    WHERE assist_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_assists_updated = ROW_COUNT;

    -- 5. 용병 레코드 상태 변경
    UPDATE public.team_members
    SET status = 'merged',
        merged_to = v_new_member_id,
        merged_at = NOW()
    WHERE id = v_request.guest_member_id;

    -- 6. 병합 요청 상태 변경
    UPDATE public.record_merge_requests
    SET status = 'accepted',
        processed_at = NOW()
    WHERE id = p_merge_request_id;

    RETURN json_build_object(
        'success', true,
        'new_member_id', v_new_member_id,
        'records_updated', v_records_updated,
        'records_merged', v_records_merged,
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
'용병 기록을 정규 팀원에게 병합합니다. 
- 같은 경기에 용병/정식 기록이 모두 있으면 합산 후 용병 기록 삭제
- 용병만 기록이 있으면 team_member_id 업데이트
- 기존 멤버십(pending/left 포함)이 있으면 active로 업데이트하고, 없으면 새로 생성';
