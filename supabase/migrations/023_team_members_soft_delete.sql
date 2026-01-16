-- 팀원 소프트 딜리트 기능 추가
-- 탈퇴/방출 시 기록을 보존하고, 재가입 시 복원 가능하도록 함

-- member_status enum에 'left' 추가
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'left';

-- team_members 테이블에 left_at 컬럼 추가
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

-- left_at 컬럼에 코멘트 추가
COMMENT ON COLUMN team_members.left_at IS '팀 탈퇴/방출 시간. 탈퇴 시 status를 left로 변경하고 이 컬럼에 시간 기록';

-- 인덱스 추가 (활성 멤버 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_status ON team_members(team_id, status);
