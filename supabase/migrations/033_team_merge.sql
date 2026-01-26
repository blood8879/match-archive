-- Team Merge Feature: 게스트팀 기록 통합
-- 게스트팀이 서비스에 가입 시 기존 경기 기록을 통합하는 기능

-- =====================================================
-- 1. matches 테이블 수정
-- =====================================================

-- 병합 관련 컬럼 추가
ALTER TABLE matches ADD COLUMN IF NOT EXISTS 
  source_type TEXT DEFAULT 'original';

ALTER TABLE matches ADD COLUMN IF NOT EXISTS 
  linked_match_id UUID REFERENCES matches(id) ON DELETE SET NULL;

-- 제약 조건 추가
DO $$ BEGIN
  ALTER TABLE matches ADD CONSTRAINT matches_source_type_check 
    CHECK (source_type IN ('original', 'merged'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_matches_linked ON matches(linked_match_id);
CREATE INDEX IF NOT EXISTS idx_matches_source_type ON matches(source_type);

-- 코멘트
COMMENT ON COLUMN matches.source_type IS 'original: 직접 기록한 경기, merged: 상대팀 기록에서 병합된 경기';
COMMENT ON COLUMN matches.linked_match_id IS '같은 실제 경기를 나타내는 상대팀의 match ID (양방향 링크)';

-- =====================================================
-- 2. team_merge_requests 테이블
-- =====================================================

CREATE TABLE IF NOT EXISTS team_merge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 요청 팀
  requester_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 대상
  guest_team_id UUID REFERENCES guest_teams(id) ON DELETE SET NULL,
  target_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- 승인
  approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 상태
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- 결과 통계
  matches_created INTEGER DEFAULT 0,
  matches_linked INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  CONSTRAINT team_merge_requests_status_check 
    CHECK (status IN ('pending', 'dispute', 'approved', 'rejected', 'cancelled'))
);

-- UNIQUE INDEX with COALESCE for NULL handling
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_merge_requests_unique 
  ON team_merge_requests(requester_team_id, target_team_id, COALESCE(guest_team_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_team_merge_requests_requester ON team_merge_requests(requester_team_id);
CREATE INDEX IF NOT EXISTS idx_team_merge_requests_target ON team_merge_requests(target_team_id);
CREATE INDEX IF NOT EXISTS idx_team_merge_requests_status ON team_merge_requests(status);
CREATE INDEX IF NOT EXISTS idx_team_merge_requests_guest ON team_merge_requests(guest_team_id);

-- RLS
ALTER TABLE team_merge_requests ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 관련 팀 멤버만 조회 가능
CREATE POLICY "Team members can view merge requests" ON team_merge_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND (tm.team_id = requester_team_id OR tm.team_id = target_team_id)
    )
  );

-- RLS 정책: 팀 관리자만 요청 생성 가능
CREATE POLICY "Team managers can create merge requests" ON team_merge_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = requester_team_id
      AND tm.role IN ('OWNER', 'MANAGER')
      AND tm.status = 'active'
    )
  );

-- RLS 정책: 관련 팀 관리자만 업데이트 가능
CREATE POLICY "Team managers can update merge requests" ON team_merge_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'MANAGER')
      AND tm.status = 'active'
      AND (tm.team_id = requester_team_id OR tm.team_id = target_team_id)
    )
  );

COMMENT ON TABLE team_merge_requests IS '팀 간 경기 기록 통합 요청';

-- =====================================================
-- 3. team_merge_match_mappings 테이블
-- =====================================================

CREATE TABLE IF NOT EXISTS team_merge_match_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_request_id UUID NOT NULL REFERENCES team_merge_requests(id) ON DELETE CASCADE,
  
  -- 원본 경기
  source_match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- 원본이 어느 팀 것인지
  source_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- 매핑 유형
  mapping_type TEXT NOT NULL DEFAULT 'create_new',
  
  -- 기존 경기 연결 시
  existing_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  
  -- 생성된 미러 경기
  created_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  
  -- 처리 상태
  status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT merge_mappings_type_check 
    CHECK (mapping_type IN ('create_new', 'link_existing', 'skip', 'dispute')),
  CONSTRAINT merge_mappings_status_check 
    CHECK (status IN ('pending', 'dispute', 'processed', 'skipped'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_merge_mappings_request ON team_merge_match_mappings(merge_request_id);
CREATE INDEX IF NOT EXISTS idx_merge_mappings_source_match ON team_merge_match_mappings(source_match_id);
CREATE INDEX IF NOT EXISTS idx_merge_mappings_status ON team_merge_match_mappings(status);

-- RLS
ALTER TABLE team_merge_match_mappings ENABLE ROW LEVEL SECURITY;

-- RLS 정책: merge_request를 볼 수 있으면 mappings도 볼 수 있음
CREATE POLICY "View mappings through merge request" ON team_merge_match_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_merge_requests mr
      JOIN team_members tm ON (tm.team_id = mr.requester_team_id OR tm.team_id = mr.target_team_id)
      WHERE mr.id = merge_request_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Manage mappings through merge request" ON team_merge_match_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_merge_requests mr
      JOIN team_members tm ON (tm.team_id = mr.requester_team_id OR tm.team_id = mr.target_team_id)
      WHERE mr.id = merge_request_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'MANAGER')
      AND tm.status = 'active'
    )
  );

COMMENT ON TABLE team_merge_match_mappings IS '병합 요청별 개별 경기 매핑';

-- =====================================================
-- 4. team_merge_disputes 테이블
-- =====================================================

CREATE TABLE IF NOT EXISTS team_merge_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  mapping_id UUID NOT NULL REFERENCES team_merge_match_mappings(id) ON DELETE CASCADE,
  
  -- 원본 기록 (요청팀 관점)
  requester_home_score INTEGER NOT NULL,
  requester_away_score INTEGER NOT NULL,
  
  -- 대상팀 기존 기록 (있는 경우, 대상팀 관점)
  target_home_score INTEGER,
  target_away_score INTEGER,
  
  -- 요청팀 제출 점수 (요청팀 관점: home=요청팀, away=대상팀)
  requester_submitted_home INTEGER,
  requester_submitted_away INTEGER,
  requester_submitted_at TIMESTAMPTZ,
  requester_submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 대상팀 제출 점수 (대상팀 관점: home=대상팀, away=요청팀)
  target_submitted_home INTEGER,
  target_submitted_away INTEGER,
  target_submitted_at TIMESTAMPTZ,
  target_submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 상태
  status TEXT DEFAULT 'pending',
  
  -- 해결된 최종 점수 (요청팀 관점)
  resolved_home_score INTEGER,
  resolved_away_score INTEGER,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT disputes_status_check CHECK (status IN ('pending', 'resolved', 'cancelled'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_disputes_mapping ON team_merge_disputes(mapping_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON team_merge_disputes(status);

-- RLS
ALTER TABLE team_merge_disputes ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "View disputes through mapping" ON team_merge_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_merge_match_mappings mm
      JOIN team_merge_requests mr ON mr.id = mm.merge_request_id
      JOIN team_members tm ON (tm.team_id = mr.requester_team_id OR tm.team_id = mr.target_team_id)
      WHERE mm.id = mapping_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Manage disputes through mapping" ON team_merge_disputes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_merge_match_mappings mm
      JOIN team_merge_requests mr ON mr.id = mm.merge_request_id
      JOIN team_members tm ON (tm.team_id = mr.requester_team_id OR tm.team_id = mr.target_team_id)
      WHERE mm.id = mapping_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'MANAGER')
      AND tm.status = 'active'
    )
  );

COMMENT ON TABLE team_merge_disputes IS '점수 불일치 조정 테이블';

-- =====================================================
-- 5. notifications 테이블 수정
-- =====================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS 
  related_team_merge_id UUID REFERENCES team_merge_requests(id) ON DELETE SET NULL;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS 
  related_dispute_id UUID REFERENCES team_merge_disputes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_team_merge ON notifications(related_team_merge_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dispute ON notifications(related_dispute_id);

-- =====================================================
-- 6. submit_dispute_score 함수
-- =====================================================

CREATE OR REPLACE FUNCTION submit_dispute_score(
  p_dispute_id UUID,
  p_user_id UUID,
  p_home_score INTEGER,
  p_away_score INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_dispute RECORD;
  v_mapping RECORD;
  v_request RECORD;
  v_is_requester BOOLEAN;
  v_requester_team_name TEXT;
  v_target_team_name TEXT;
BEGIN
  -- 분쟁 정보 조회
  SELECT d.*, mm.merge_request_id, mm.source_match_id
  INTO v_dispute
  FROM team_merge_disputes d
  JOIN team_merge_match_mappings mm ON mm.id = d.mapping_id
  WHERE d.id = p_dispute_id AND d.status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '유효하지 않은 분쟁이거나 이미 해결되었습니다');
  END IF;
  
  -- 요청 정보
  SELECT mr.*, 
         rt.name as requester_name,
         tt.name as target_name
  INTO v_request
  FROM team_merge_requests mr
  JOIN teams rt ON rt.id = mr.requester_team_id
  JOIN teams tt ON tt.id = mr.target_team_id
  WHERE mr.id = v_dispute.merge_request_id;
  
  -- 사용자가 어느 팀인지 확인
  v_is_requester := EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = v_request.requester_team_id 
    AND user_id = p_user_id 
    AND role IN ('OWNER', 'MANAGER')
    AND status = 'active'
  );
  
  -- 권한 확인
  IF NOT v_is_requester AND NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = v_request.target_team_id 
    AND user_id = p_user_id 
    AND role IN ('OWNER', 'MANAGER')
    AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '권한이 없습니다');
  END IF;
  
  -- 점수 저장
  IF v_is_requester THEN
    UPDATE team_merge_disputes SET
      requester_submitted_home = p_home_score,
      requester_submitted_away = p_away_score,
      requester_submitted_at = NOW(),
      requester_submitted_by = p_user_id
    WHERE id = p_dispute_id;
  ELSE
    -- 대상팀의 점수 저장 (대상팀 관점: home=대상팀)
    UPDATE team_merge_disputes SET
      target_submitted_home = p_home_score,
      target_submitted_away = p_away_score,
      target_submitted_at = NOW(),
      target_submitted_by = p_user_id
    WHERE id = p_dispute_id;
  END IF;
  
  -- 다시 조회
  SELECT * INTO v_dispute FROM team_merge_disputes WHERE id = p_dispute_id;
  
  -- 양팀 점수 일치 확인
  -- 요청팀 관점: home=요청팀, away=대상팀
  -- 대상팀 관점: home=대상팀, away=요청팀
  -- 일치 조건: 요청팀.home = 대상팀.away AND 요청팀.away = 대상팀.home
  IF v_dispute.requester_submitted_home IS NOT NULL 
     AND v_dispute.target_submitted_home IS NOT NULL
     AND v_dispute.requester_submitted_home = v_dispute.target_submitted_away
     AND v_dispute.requester_submitted_away = v_dispute.target_submitted_home
  THEN
    -- 해결됨!
    UPDATE team_merge_disputes SET
      status = 'resolved',
      resolved_home_score = v_dispute.requester_submitted_home,
      resolved_away_score = v_dispute.requester_submitted_away,
      resolved_at = NOW()
    WHERE id = p_dispute_id;
    
    -- 매핑 상태 업데이트
    UPDATE team_merge_match_mappings SET
      mapping_type = 'create_new',
      status = 'pending'
    WHERE id = v_dispute.mapping_id;
    
    -- 모든 분쟁이 해결되었는지 확인하고 요청 상태 업데이트
    IF NOT EXISTS (
      SELECT 1 FROM team_merge_match_mappings mm
      JOIN team_merge_disputes d ON d.mapping_id = mm.id
      WHERE mm.merge_request_id = v_dispute.merge_request_id
      AND d.status = 'pending'
    ) THEN
      UPDATE team_merge_requests SET status = 'pending'
      WHERE id = v_dispute.merge_request_id AND status = 'dispute';
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'resolved', true,
      'final_score', format('%s:%s', 
        v_dispute.requester_submitted_home, 
        v_dispute.requester_submitted_away)
    );
  END IF;
  
  -- 아직 해결 안됨
  RETURN jsonb_build_object(
    'success', true,
    'resolved', false,
    'submitted_by', CASE WHEN v_is_requester THEN 'requester' ELSE 'target' END,
    'waiting_for', CASE 
      WHEN v_is_requester AND v_dispute.target_submitted_home IS NULL THEN 'target_team'
      WHEN NOT v_is_requester AND v_dispute.requester_submitted_home IS NULL THEN 'requester_team'
      ELSE 'score_mismatch'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION submit_dispute_score(UUID, UUID, INTEGER, INTEGER) TO authenticated;

-- =====================================================
-- 7. process_team_merge 함수
-- =====================================================

CREATE OR REPLACE FUNCTION process_team_merge(
  p_request_id UUID,
  p_approver_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_mapping RECORD;
  v_source_match RECORD;
  v_dispute RECORD;
  v_new_match_id UUID;
  v_matches_created INTEGER := 0;
  v_matches_linked INTEGER := 0;
  v_home_score INTEGER;
  v_away_score INTEGER;
BEGIN
  -- 요청 정보 조회
  SELECT mr.*, 
         rt.name as requester_name,
         tt.name as target_name
  INTO v_request
  FROM team_merge_requests mr
  JOIN teams rt ON rt.id = mr.requester_team_id
  JOIN teams tt ON tt.id = mr.target_team_id
  WHERE mr.id = p_request_id 
  AND mr.status IN ('pending', 'dispute');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '유효하지 않은 요청입니다');
  END IF;
  
  -- 승인자 권한 확인 (대상팀 관리자)
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_request.target_team_id
    AND user_id = p_approver_id
    AND role IN ('OWNER', 'MANAGER')
    AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '승인 권한이 없습니다');
  END IF;
  
  -- 미해결 분쟁 확인
  IF EXISTS (
    SELECT 1 FROM team_merge_match_mappings mm
    JOIN team_merge_disputes d ON d.mapping_id = mm.id
    WHERE mm.merge_request_id = p_request_id
    AND d.status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '해결되지 않은 점수 불일치가 있습니다');
  END IF;
  
  -- 각 매핑 처리
  FOR v_mapping IN 
    SELECT mm.*, d.resolved_home_score, d.resolved_away_score
    FROM team_merge_match_mappings mm
    LEFT JOIN team_merge_disputes d ON d.mapping_id = mm.id
    WHERE mm.merge_request_id = p_request_id 
    AND mm.status = 'pending'
  LOOP
    -- 원본 경기 조회
    SELECT * INTO v_source_match FROM matches WHERE id = v_mapping.source_match_id;
    
    IF v_mapping.mapping_type = 'create_new' THEN
      -- 분쟁 해결 점수가 있으면 사용, 없으면 원본 점수 반전
      IF v_mapping.resolved_home_score IS NOT NULL THEN
        -- 해결된 점수 사용 (요청팀 관점)
        -- 미러 경기는 대상팀 관점이므로 반전
        v_home_score := v_mapping.resolved_away_score;
        v_away_score := v_mapping.resolved_home_score;
      ELSE
        -- 원본 점수 반전
        v_home_score := v_source_match.away_score;
        v_away_score := v_source_match.home_score;
      END IF;
      
      -- 미러 경기 생성
      INSERT INTO matches (
        team_id,
        opponent_team_id,
        opponent_name,
        match_date,
        location,
        venue_id,
        home_score,
        away_score,
        is_home,
        status,
        quarters,
        source_type,
        linked_match_id
      ) VALUES (
        CASE 
          WHEN v_mapping.source_team_id = v_request.requester_team_id 
          THEN v_request.target_team_id
          ELSE v_request.requester_team_id
        END,
        v_mapping.source_team_id,
        CASE 
          WHEN v_mapping.source_team_id = v_request.requester_team_id 
          THEN v_request.requester_name
          ELSE v_request.target_name
        END,
        v_source_match.match_date,
        v_source_match.location,
        v_source_match.venue_id,
        v_home_score,
        v_away_score,
        NOT COALESCE(v_source_match.is_home, true),
        v_source_match.status,
        v_source_match.quarters,
        'merged',
        v_source_match.id
      )
      RETURNING id INTO v_new_match_id;
      
      -- 원본 경기에도 링크 설정
      UPDATE matches SET linked_match_id = v_new_match_id 
      WHERE id = v_source_match.id;
      
      -- 매핑 업데이트
      UPDATE team_merge_match_mappings SET
        created_match_id = v_new_match_id,
        status = 'processed'
      WHERE id = v_mapping.id;
      
      v_matches_created := v_matches_created + 1;
      
    ELSIF v_mapping.mapping_type = 'link_existing' THEN
      -- 기존 경기 연결 (양방향)
      UPDATE matches SET linked_match_id = v_mapping.source_match_id
      WHERE id = v_mapping.existing_match_id;
      
      UPDATE matches SET linked_match_id = v_mapping.existing_match_id
      WHERE id = v_mapping.source_match_id;
      
      UPDATE team_merge_match_mappings SET status = 'processed'
      WHERE id = v_mapping.id;
      
      v_matches_linked := v_matches_linked + 1;
      
    ELSIF v_mapping.mapping_type = 'skip' THEN
      UPDATE team_merge_match_mappings SET status = 'skipped'
      WHERE id = v_mapping.id;
    END IF;
  END LOOP;
  
  -- 게스트팀이 있으면 참조 업데이트
  IF v_request.guest_team_id IS NOT NULL THEN
    UPDATE matches 
    SET 
      opponent_team_id = v_request.target_team_id,
      guest_team_id = NULL,
      is_guest_opponent = false
    WHERE guest_team_id = v_request.guest_team_id
    AND team_id = v_request.requester_team_id;
  END IF;
  
  -- 요청 완료 처리
  UPDATE team_merge_requests SET
    status = 'approved',
    approver_user_id = p_approver_id,
    matches_created = v_matches_created,
    matches_linked = v_matches_linked,
    processed_at = NOW()
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'matches_created', v_matches_created,
    'matches_linked', v_matches_linked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION process_team_merge(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION process_team_merge IS '팀 병합 요청 승인 처리 - 미러 경기 생성 및 연결';
COMMENT ON FUNCTION submit_dispute_score IS '점수 불일치 조정을 위한 점수 제출';
