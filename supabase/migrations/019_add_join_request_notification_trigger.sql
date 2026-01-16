-- Migration: Add join request notification triggers
-- Description: Creates triggers to notify team managers when a user requests to join their team

-- 1. notifications 테이블의 type 체크 제약조건 수정 (join_request, join_accepted, join_rejected 추가)
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY[
  'team_invite'::text,
  'merge_request'::text,
  'invite_accepted'::text,
  'invite_rejected'::text,
  'merge_accepted'::text,
  'merge_rejected'::text,
  'team_joined'::text,
  'match_created'::text,
  'match_reminder'::text,
  'join_request'::text,
  'join_accepted'::text,
  'join_rejected'::text
]));

-- 2. 팀 가입신청 시 팀 관리자들에게 알림 생성하는 함수
CREATE OR REPLACE FUNCTION notify_join_request()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_user_nickname TEXT;
  v_manager RECORD;
BEGIN
  -- 새로운 가입 신청인 경우에만 처리 (pending 상태로 INSERT)
  IF NEW.status = 'pending' AND NEW.is_guest = false AND NEW.user_id IS NOT NULL THEN
    -- 팀 이름 조회
    SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;

    -- 신청자 닉네임 조회
    SELECT nickname INTO v_user_nickname FROM users WHERE id = NEW.user_id;

    -- 팀의 OWNER와 MANAGER들에게 알림 전송
    FOR v_manager IN
      SELECT user_id
      FROM team_members
      WHERE team_id = NEW.team_id
        AND role IN ('OWNER', 'MANAGER')
        AND status = 'active'
        AND user_id IS NOT NULL
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_team_id,
        metadata
      ) VALUES (
        v_manager.user_id,
        'join_request',
        '새로운 가입 신청',
        COALESCE(v_user_nickname, '익명 사용자') || '님이 ' || COALESCE(v_team_name, '팀') || '에 가입을 신청했습니다.',
        NEW.team_id,
        jsonb_build_object('member_id', NEW.id, 'applicant_id', NEW.user_id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 가입 승인 시 신청자에게 알림 생성하는 함수
CREATE OR REPLACE FUNCTION notify_join_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
BEGIN
  -- pending → active (승인)
  IF OLD.status = 'pending' AND NEW.status = 'active' AND NEW.user_id IS NOT NULL THEN
    SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;

    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_team_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'join_accepted',
      '가입 승인',
      COALESCE(v_team_name, '팀') || ' 팀의 가입이 승인되었습니다.',
      NEW.team_id,
      jsonb_build_object('member_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 가입 거절(삭제) 시 신청자에게 알림 생성하는 함수
CREATE OR REPLACE FUNCTION notify_join_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
BEGIN
  -- pending 상태에서 삭제된 경우 (거절)
  IF OLD.status = 'pending' AND OLD.user_id IS NOT NULL THEN
    SELECT name INTO v_team_name FROM teams WHERE id = OLD.team_id;

    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_team_id,
      metadata
    ) VALUES (
      OLD.user_id,
      'join_rejected',
      '가입 거절',
      COALESCE(v_team_name, '팀') || ' 팀의 가입이 거절되었습니다.',
      OLD.team_id,
      '{}'::jsonb
    );
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 트리거 생성
DROP TRIGGER IF EXISTS trigger_notify_join_request ON team_members;
CREATE TRIGGER trigger_notify_join_request
  AFTER INSERT ON team_members
  FOR EACH ROW
  WHEN (NEW.status = 'pending' AND NEW.is_guest = false)
  EXECUTE FUNCTION notify_join_request();

DROP TRIGGER IF EXISTS trigger_notify_join_status_change ON team_members;
CREATE TRIGGER trigger_notify_join_status_change
  AFTER UPDATE ON team_members
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'active')
  EXECUTE FUNCTION notify_join_status_change();

DROP TRIGGER IF EXISTS trigger_notify_join_rejected ON team_members;
CREATE TRIGGER trigger_notify_join_rejected
  BEFORE DELETE ON team_members
  FOR EACH ROW
  WHEN (OLD.status = 'pending')
  EXECUTE FUNCTION notify_join_rejected();
