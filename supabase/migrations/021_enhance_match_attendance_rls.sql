-- Migration: Enhance match_attendance RLS policies
-- Description: Add manager policies for match attendance management

-- 매니저는 팀 멤버들의 참석 정보 INSERT 가능
CREATE POLICY "Team managers can insert attendance for team members"
ON match_attendance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM matches m
    JOIN team_members manager ON manager.team_id = m.team_id
    WHERE m.id = match_attendance.match_id
      AND manager.user_id = auth.uid()
      AND manager.role IN ('OWNER', 'MANAGER')
      AND manager.status = 'active'
  )
);

-- 매니저는 팀 멤버들의 참석 정보 UPDATE 가능
CREATE POLICY "Team managers can update attendance for team members"
ON match_attendance FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM matches m
    JOIN team_members manager ON manager.team_id = m.team_id
    WHERE m.id = match_attendance.match_id
      AND manager.user_id = auth.uid()
      AND manager.role IN ('OWNER', 'MANAGER')
      AND manager.status = 'active'
  )
);

-- 매니저는 팀 멤버들의 참석 정보 DELETE 가능
CREATE POLICY "Team managers can delete attendance for team members"
ON match_attendance FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM matches m
    JOIN team_members manager ON manager.team_id = m.team_id
    WHERE m.id = match_attendance.match_id
      AND manager.user_id = auth.uid()
      AND manager.role IN ('OWNER', 'MANAGER')
      AND manager.status = 'active'
  )
);
