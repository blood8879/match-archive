-- =====================================================
-- 팀 기록 통합 기능 개선
-- 1. 게스트팀 병합 상태 관리
-- 2. self-merge 방지
-- 3. process_team_merge 함수 개선
-- =====================================================

-- 1. guest_teams 테이블에 병합 관련 컬럼 추가
ALTER TABLE guest_teams 
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS merged_to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

-- 인덱스 추가 (병합되지 않은 게스트팀만 조회할 때 사용)
CREATE INDEX IF NOT EXISTS idx_guest_teams_is_merged 
ON guest_teams(is_merged) WHERE is_merged = false;

CREATE INDEX IF NOT EXISTS idx_guest_teams_merged_to 
ON guest_teams(merged_to_team_id) WHERE merged_to_team_id IS NOT NULL;

-- 컬럼 설명
COMMENT ON COLUMN guest_teams.is_merged IS '실제 팀과 병합 완료 여부';
COMMENT ON COLUMN guest_teams.merged_to_team_id IS '병합된 실제 팀 ID';
COMMENT ON COLUMN guest_teams.merged_at IS '병합 완료 시각';

-- 2. team_merge_requests에 self-merge 방지 constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'team_merge_requests_no_self_merge'
  ) THEN
    ALTER TABLE team_merge_requests 
    ADD CONSTRAINT team_merge_requests_no_self_merge 
    CHECK (requester_team_id != target_team_id);
  END IF;
END $$;

-- 3. process_team_merge 함수 업데이트 (게스트팀 병합 플래그 설정)
CREATE OR REPLACE FUNCTION process_team_merge(
  p_request_id UUID,
  p_approver_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_mapping RECORD;
  v_source_match RECORD;
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
        v_home_score := v_mapping.resolved_away_score;
        v_away_score := v_mapping.resolved_home_score;
      ELSE
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
  
  -- 게스트팀 처리 (개선됨)
  IF v_request.guest_team_id IS NOT NULL THEN
    -- 1. 해당 게스트팀을 참조하는 모든 매치의 opponent_team_id 업데이트
    UPDATE matches 
    SET 
      opponent_team_id = v_request.target_team_id,
      guest_team_id = NULL,
      is_guest_opponent = false
    WHERE guest_team_id = v_request.guest_team_id
    AND team_id = v_request.requester_team_id;
    
    -- 2. 게스트팀을 병합 완료로 표시
    UPDATE guest_teams
    SET 
      is_merged = true,
      merged_to_team_id = v_request.target_team_id,
      merged_at = NOW()
    WHERE id = v_request.guest_team_id;
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

-- 4. 게스트팀 목록 조회 시 병합된 팀 제외하도록 뷰 또는 함수 추가 (선택적)
-- 기존 쿼리에서 WHERE is_merged = false 조건 추가 권장

COMMENT ON FUNCTION process_team_merge IS '팀 병합 요청 승인 처리 - 미러 경기 생성, 연결, 게스트팀 병합 플래그 설정';
