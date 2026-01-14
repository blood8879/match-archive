-- 기록 병합 요청 테이블 생성
-- 용병으로 뛴 기록을 정규 팀원에게 병합하기 위한 요청 관리

-- 병합 요청 상태 타입
DO $$ BEGIN
    CREATE TYPE merge_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 기록 병합 요청 테이블
CREATE TABLE IF NOT EXISTS public.record_merge_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    guest_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status merge_request_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ,
    -- 같은 용병 기록에 대해 중복 요청 방지
    CONSTRAINT unique_pending_merge_request UNIQUE (guest_member_id, invitee_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_record_merge_requests_team_id ON public.record_merge_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_record_merge_requests_guest_member_id ON public.record_merge_requests(guest_member_id);
CREATE INDEX IF NOT EXISTS idx_record_merge_requests_inviter_id ON public.record_merge_requests(inviter_id);
CREATE INDEX IF NOT EXISTS idx_record_merge_requests_invitee_id ON public.record_merge_requests(invitee_id);
CREATE INDEX IF NOT EXISTS idx_record_merge_requests_status ON public.record_merge_requests(status);

-- 타임스탬프 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_record_merge_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_record_merge_request_update ON public.record_merge_requests;
CREATE TRIGGER on_record_merge_request_update
    BEFORE UPDATE ON public.record_merge_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_record_merge_request_timestamp();

-- team_members 테이블에 merged_to 컬럼 추가 (병합된 경우 대상 team_member_id 저장)
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS merged_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

-- team_members 테이블에 merged_at 컬럼 추가
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

-- RLS 정책 설정
ALTER TABLE public.record_merge_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: 관련된 사용자만 조회 가능 (팀 관리자 또는 초대받은 사람)
CREATE POLICY "Users can view relevant merge requests" ON public.record_merge_requests
FOR SELECT USING (
    auth.uid() = inviter_id
    OR auth.uid() = invitee_id
    OR EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = record_merge_requests.team_id
        AND user_id = auth.uid()
        AND role IN ('OWNER', 'MANAGER')
        AND status = 'active'
    )
);

-- INSERT: 팀 OWNER/MANAGER만 병합 요청 생성 가능
CREATE POLICY "Team managers can create merge requests" ON public.record_merge_requests
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = record_merge_requests.team_id
        AND user_id = auth.uid()
        AND role IN ('OWNER', 'MANAGER')
        AND status = 'active'
    )
);

-- UPDATE: 초대받은 사용자는 상태 변경 가능, 관리자는 취소 가능
CREATE POLICY "Users can update their merge requests" ON public.record_merge_requests
FOR UPDATE USING (
    auth.uid() = invitee_id
    OR EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = record_merge_requests.team_id
        AND user_id = auth.uid()
        AND role IN ('OWNER', 'MANAGER')
        AND status = 'active'
    )
);

-- DELETE: 팀 OWNER/MANAGER만 삭제 가능
CREATE POLICY "Team managers can delete merge requests" ON public.record_merge_requests
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = record_merge_requests.team_id
        AND user_id = auth.uid()
        AND role IN ('OWNER', 'MANAGER')
        AND status = 'active'
    )
);

-- 기록 병합 처리 함수 (트랜잭션으로 안전하게 처리)
CREATE OR REPLACE FUNCTION public.process_record_merge(
    p_merge_request_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_new_member_id UUID;
    v_records_updated INTEGER := 0;
    v_goals_updated INTEGER := 0;
    v_assists_updated INTEGER := 0;
BEGIN
    -- 병합 요청 조회 및 검증
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

    -- 이미 팀 멤버인지 확인
    SELECT id INTO v_new_member_id
    FROM public.team_members
    WHERE team_id = v_request.team_id
    AND user_id = p_user_id
    AND status = 'active'
    AND is_guest = false;

    -- 팀 멤버가 아니면 새로 생성
    IF v_new_member_id IS NULL THEN
        INSERT INTO public.team_members (
            team_id, user_id, role, status, is_guest, joined_at
        ) VALUES (
            v_request.team_id, p_user_id, 'MEMBER', 'active', false, NOW()
        )
        RETURNING id INTO v_new_member_id;
    END IF;

    -- match_records의 team_member_id 업데이트
    UPDATE public.match_records
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_records_updated = ROW_COUNT;

    -- goals의 team_member_id 업데이트 (득점자)
    UPDATE public.goals
    SET team_member_id = v_new_member_id
    WHERE team_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_goals_updated = ROW_COUNT;

    -- goals의 assist_member_id 업데이트 (어시스트)
    UPDATE public.goals
    SET assist_member_id = v_new_member_id
    WHERE assist_member_id = v_request.guest_member_id;

    GET DIAGNOSTICS v_assists_updated = ROW_COUNT;

    -- 원본 용병 레코드 비활성화 및 병합 정보 저장
    UPDATE public.team_members
    SET status = 'merged',
        merged_to = v_new_member_id,
        merged_at = NOW()
    WHERE id = v_request.guest_member_id;

    -- 병합 요청 상태 업데이트
    UPDATE public.record_merge_requests
    SET status = 'accepted',
        processed_at = NOW()
    WHERE id = p_merge_request_id;

    RETURN json_build_object(
        'success', true,
        'new_member_id', v_new_member_id,
        'records_updated', v_records_updated,
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

-- team_members의 status에 'merged' 값 허용
-- (기존 check constraint가 있다면 수정 필요)
DO $$
BEGIN
    -- member_status 타입에 'merged' 추가 시도
    ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'merged';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

COMMENT ON TABLE public.record_merge_requests IS '용병 기록을 정규 팀원에게 병합하기 위한 요청 테이블';
COMMENT ON COLUMN public.record_merge_requests.guest_member_id IS '병합 대상 용병의 team_member ID';
COMMENT ON COLUMN public.record_merge_requests.inviter_id IS '병합 요청을 생성한 팀 관리자';
COMMENT ON COLUMN public.record_merge_requests.invitee_id IS '기록을 받을 사용자 (user_code로 찾음)';
COMMENT ON COLUMN public.team_members.merged_to IS '이 용병 기록이 병합된 정규 팀원의 ID';
COMMENT ON COLUMN public.team_members.merged_at IS '기록이 병합된 시간';
