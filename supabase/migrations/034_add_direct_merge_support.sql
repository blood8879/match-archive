-- 기록 병합 직접 처리 기능 지원
-- 이미 팀 멤버인 사용자에 대해 운영진이 바로 병합할 수 있도록 지원

-- 1. record_merge_requests 테이블에 merged_by 컬럼 추가 (감사 로그용)
-- 운영진이 직접 병합한 경우 해당 운영진의 user_id를 기록
ALTER TABLE public.record_merge_requests
ADD COLUMN IF NOT EXISTS merged_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.record_merge_requests.merged_by IS 
'운영진이 직접 병합한 경우 해당 운영진의 user_id. NULL이면 사용자가 직접 수락한 경우.';

-- 2. 직접 병합 처리 함수 (운영진이 팀 멤버에 대해 바로 병합)
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
    -- 1. 용병 멤버 확인
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

    -- 2. 대상 사용자가 이 팀의 active 멤버인지 확인
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

    -- 3. 중복 경기 기록 처리 (용병/정식 둘 다 같은 경기에 출전한 경우)
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

    -- 4. 나머지 경기 기록 이전
    UPDATE public.match_records
    SET team_member_id = v_new_member_id
    WHERE team_member_id = p_guest_member_id;

    GET DIAGNOSTICS v_records_updated = ROW_COUNT;

    -- 5. goals 테이블 업데이트 (득점자)
    UPDATE public.goals
    SET team_member_id = v_new_member_id
    WHERE team_member_id = p_guest_member_id;

    GET DIAGNOSTICS v_goals_updated = ROW_COUNT;

    -- 6. goals 테이블 업데이트 (어시스트)
    UPDATE public.goals
    SET assist_member_id = v_new_member_id
    WHERE assist_member_id = p_guest_member_id;

    GET DIAGNOSTICS v_assists_updated = ROW_COUNT;

    -- 7. 용병 레코드 상태 변경
    UPDATE public.team_members
    SET status = 'merged',
        merged_to = v_new_member_id,
        merged_at = NOW()
    WHERE id = p_guest_member_id;

    -- 8. 감사 로그용 병합 기록 생성
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

-- 함수 설명
COMMENT ON FUNCTION public.process_direct_merge IS 
'이미 팀의 active 멤버인 사용자에게 용병 기록을 직접 병합합니다.
운영진(OWNER/MANAGER)이 수락 과정 없이 바로 병합할 수 있습니다.
감사 추적을 위해 merged_by에 운영진 ID가 기록됩니다.';
