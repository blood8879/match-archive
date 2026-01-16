-- Migration: Fix match_records RLS for attendance
-- Description: Allow team members to insert/delete their own match_records when updating attendance

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team managers can manage match records" ON match_records;

-- 새로운 정책: 매니저는 모든 작업 가능
CREATE POLICY "Team managers can manage all match records"
ON match_records FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM matches m
    JOIN team_members tm ON tm.team_id = m.team_id
    WHERE m.id = match_records.match_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'MANAGER')
  )
);

-- 새로운 정책: 팀 멤버는 자신의 기록만 INSERT 가능 (참석 시)
CREATE POLICY "Team members can insert own match records"
ON match_records FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM matches m
    JOIN team_members tm ON tm.team_id = m.team_id AND tm.id = match_records.team_member_id
    WHERE m.id = match_records.match_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- 새로운 정책: 팀 멤버는 자신의 기록 삭제 가능 (참석 취소 시, 득점/도움 없는 경우)
CREATE POLICY "Team members can delete own empty match records"
ON match_records FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM matches m
    JOIN team_members tm ON tm.team_id = m.team_id AND tm.id = match_records.team_member_id
    WHERE m.id = match_records.match_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
  AND goals = 0
  AND assists = 0
);
