-- 팀 소프트 딜리트를 위한 deleted_at 컬럼 추가
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 삭제된 팀을 제외하는 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON public.teams(deleted_at);

-- 기존 RLS 정책들을 업데이트하여 삭제된 팀 제외
-- 먼저 기존 정책 삭제 후 재생성

DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams" ON public.teams
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Team owner can update team" ON public.teams;
CREATE POLICY "Team owner can update team" ON public.teams
    FOR UPDATE USING (
        auth.uid() = owner_id 
        OR EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_id = teams.id
            AND user_id = auth.uid()
            AND role IN ('OWNER', 'MANAGER')
            AND status = 'active'
        )
    );

-- 팀 소프트 딜리트 함수
CREATE OR REPLACE FUNCTION public.soft_delete_team(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- OWNER만 삭제 가능
    IF NOT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = p_team_id
        AND user_id = v_user_id
        AND role = 'OWNER'
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Only team owner can delete the team';
    END IF;
    
    -- 팀 소프트 딜리트
    UPDATE public.teams
    SET deleted_at = NOW()
    WHERE id = p_team_id
    AND deleted_at IS NULL;
    
    -- 팀 멤버들 상태를 'left'로 변경
    UPDATE public.team_members
    SET status = 'left',
        left_at = NOW()
    WHERE team_id = p_team_id
    AND status = 'active';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.soft_delete_team(UUID) TO authenticated;

COMMENT ON COLUMN public.teams.deleted_at IS '팀 삭제 시간 (소프트 딜리트)';
COMMENT ON FUNCTION public.soft_delete_team IS '팀을 소프트 딜리트합니다. OWNER만 실행 가능합니다.';
