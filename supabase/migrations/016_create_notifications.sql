-- 알림 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('team_invite', 'merge_request', 'invite_accepted', 'invite_rejected', 'merge_accepted', 'merge_rejected', 'team_joined', 'match_created', 'match_reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  -- 관련 엔티티 참조 (선택적)
  related_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  related_invite_id UUID REFERENCES team_invites(id) ON DELETE SET NULL,
  related_merge_request_id UUID REFERENCES record_merge_requests(id) ON DELETE SET NULL,
  related_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  -- 메타데이터 (추가 정보 저장용)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 자신의 알림만 조회 가능
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS 정책: 자신의 알림만 업데이트 가능 (읽음 처리)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS 정책: 자신의 알림만 삭제 가능
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS 정책: 서비스 역할로 알림 생성 (authenticated 사용자가 다른 사용자에게 알림 생성)
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 알림 생성 헬퍼 함수
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_team_id UUID DEFAULT NULL,
  p_related_invite_id UUID DEFAULT NULL,
  p_related_merge_request_id UUID DEFAULT NULL,
  p_related_match_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message,
    related_team_id, related_invite_id, related_merge_request_id, related_match_id,
    metadata
  )
  VALUES (
    p_user_id, p_type, p_title, p_message,
    p_related_team_id, p_related_invite_id, p_related_merge_request_id, p_related_match_id,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- 알림 읽음 처리 함수
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- 모든 알림 읽음 처리 함수
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 팀 초대 시 알림 생성 트리거 함수
CREATE OR REPLACE FUNCTION notify_team_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- 팀 이름 조회
  SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;

  -- 초대자 이름 조회
  SELECT COALESCE(nickname, name, email) INTO v_inviter_name FROM users WHERE id = NEW.inviter_id;

  -- 알림 생성
  PERFORM create_notification(
    NEW.invitee_id,
    'team_invite',
    v_team_name || ' 팀 초대',
    v_inviter_name || '님이 ' || v_team_name || ' 팀에 초대했습니다.',
    NEW.team_id,
    NEW.id,
    NULL,
    NULL,
    jsonb_build_object('inviter_id', NEW.inviter_id)
  );

  RETURN NEW;
END;
$$;

-- 팀 초대 트리거
DROP TRIGGER IF EXISTS trigger_notify_team_invite ON team_invites;
CREATE TRIGGER trigger_notify_team_invite
  AFTER INSERT ON team_invites
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_team_invite();

-- 기록 병합 요청 시 알림 생성 트리거 함수
CREATE OR REPLACE FUNCTION notify_merge_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_name TEXT;
  v_inviter_name TEXT;
  v_guest_name TEXT;
BEGIN
  -- 팀 이름 조회
  SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;

  -- 초대자 이름 조회
  SELECT COALESCE(nickname, name, email) INTO v_inviter_name FROM users WHERE id = NEW.inviter_id;

  -- 용병 이름 조회
  SELECT guest_name INTO v_guest_name FROM team_members WHERE id = NEW.guest_member_id;

  -- 알림 생성
  PERFORM create_notification(
    NEW.invitee_id,
    'merge_request',
    v_team_name || ' 기록 병합 요청',
    v_inviter_name || '님이 "' || COALESCE(v_guest_name, '용병') || '" 기록을 내 계정에 통합 요청했습니다.',
    NEW.team_id,
    NULL,
    NEW.id,
    NULL,
    jsonb_build_object('inviter_id', NEW.inviter_id, 'guest_name', v_guest_name)
  );

  RETURN NEW;
END;
$$;

-- 기록 병합 요청 트리거
DROP TRIGGER IF EXISTS trigger_notify_merge_request ON record_merge_requests;
CREATE TRIGGER trigger_notify_merge_request
  AFTER INSERT ON record_merge_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_merge_request();

-- 초대/병합 상태 변경 시 알림 생성 (수락/거절 결과 알림)
CREATE OR REPLACE FUNCTION notify_invite_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_name TEXT;
  v_invitee_name TEXT;
BEGIN
  -- 상태가 변경되었고, pending이 아닌 경우에만
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;
    SELECT COALESCE(nickname, name, email) INTO v_invitee_name FROM users WHERE id = NEW.invitee_id;

    IF NEW.status = 'accepted' THEN
      -- 초대자에게 수락 알림
      PERFORM create_notification(
        NEW.inviter_id,
        'invite_accepted',
        '팀 초대 수락됨',
        v_invitee_name || '님이 ' || v_team_name || ' 팀 초대를 수락했습니다.',
        NEW.team_id,
        NEW.id,
        NULL,
        NULL,
        jsonb_build_object('invitee_id', NEW.invitee_id)
      );
    ELSIF NEW.status = 'rejected' THEN
      -- 초대자에게 거절 알림
      PERFORM create_notification(
        NEW.inviter_id,
        'invite_rejected',
        '팀 초대 거절됨',
        v_invitee_name || '님이 ' || v_team_name || ' 팀 초대를 거절했습니다.',
        NEW.team_id,
        NEW.id,
        NULL,
        NULL,
        jsonb_build_object('invitee_id', NEW.invitee_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_invite_status ON team_invites;
CREATE TRIGGER trigger_notify_invite_status
  AFTER UPDATE ON team_invites
  FOR EACH ROW
  EXECUTE FUNCTION notify_invite_status_change();

-- 병합 상태 변경 알림
CREATE OR REPLACE FUNCTION notify_merge_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_name TEXT;
  v_invitee_name TEXT;
  v_guest_name TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;
    SELECT COALESCE(nickname, name, email) INTO v_invitee_name FROM users WHERE id = NEW.invitee_id;
    SELECT guest_name INTO v_guest_name FROM team_members WHERE id = NEW.guest_member_id;

    IF NEW.status = 'accepted' THEN
      PERFORM create_notification(
        NEW.inviter_id,
        'merge_accepted',
        '기록 병합 수락됨',
        v_invitee_name || '님이 "' || COALESCE(v_guest_name, '용병') || '" 기록 병합을 수락했습니다.',
        NEW.team_id,
        NULL,
        NEW.id,
        NULL,
        jsonb_build_object('invitee_id', NEW.invitee_id, 'guest_name', v_guest_name)
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.inviter_id,
        'merge_rejected',
        '기록 병합 거절됨',
        v_invitee_name || '님이 "' || COALESCE(v_guest_name, '용병') || '" 기록 병합을 거절했습니다.',
        NEW.team_id,
        NULL,
        NEW.id,
        NULL,
        jsonb_build_object('invitee_id', NEW.invitee_id, 'guest_name', v_guest_name)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_merge_status ON record_merge_requests;
CREATE TRIGGER trigger_notify_merge_status
  AFTER UPDATE ON record_merge_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_merge_status_change();
