-- 대표 클럽 기능을 위한 primary_team_id 컬럼 추가
-- 사용자가 여러 팀에 가입한 경우 대시보드에서 먼저 표시될 팀을 지정할 수 있음

-- users 테이블에 primary_team_id 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_primary_team_id ON users(primary_team_id);

-- 코멘트 추가
COMMENT ON COLUMN users.primary_team_id IS '대표 클럽 - 대시보드에서 먼저 표시될 팀';
