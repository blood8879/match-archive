# 마이그레이션 적용 가이드

## 문제
`match_attendance` 테이블이 원격 데이터베이스에 존재하지 않습니다.

## 해결 방법 1: Supabase Dashboard (추천)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택: match-archive

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "+ New query" 클릭

3. **마이그레이션 SQL 복사 & 실행**
   - 아래 SQL을 복사하여 붙여넣기
   - "Run" 버튼 클릭

```sql
-- Add attendance status type
CREATE TYPE IF NOT EXISTS attendance_status AS ENUM ('attending', 'maybe', 'absent');

-- Match attendance tracking
CREATE TABLE IF NOT EXISTS public.match_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'maybe',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(match_id, team_member_id)
);

-- Team invite links with expiry
CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    code VARCHAR(32) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0 NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_attendance_match ON public.match_attendance(match_id);
CREATE INDEX IF NOT EXISTS idx_match_attendance_member ON public.match_attendance(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_code ON public.team_invites(code);
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON public.team_invites(team_id);

-- Enable RLS
ALTER TABLE public.match_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_attendance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_attendance' AND policyname = 'Anyone can view match attendance'
    ) THEN
        CREATE POLICY "Anyone can view match attendance" ON public.match_attendance
            FOR SELECT USING (true);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_attendance' AND policyname = 'Team members can update own attendance'
    ) THEN
        CREATE POLICY "Team members can update own attendance" ON public.match_attendance
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.team_members tm
                    JOIN public.matches m ON m.team_id = tm.team_id
                    WHERE tm.id = match_attendance.team_member_id
                    AND m.id = match_attendance.match_id
                    AND tm.user_id = auth.uid()
                )
            );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_attendance' AND policyname = 'Team members can update own attendance status'
    ) THEN
        CREATE POLICY "Team members can update own attendance status" ON public.match_attendance
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.team_members tm
                    WHERE tm.id = match_attendance.team_member_id
                    AND tm.user_id = auth.uid()
                )
            );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_attendance' AND policyname = 'Team managers can manage all attendance'
    ) THEN
        CREATE POLICY "Team managers can manage all attendance" ON public.match_attendance
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.matches m
                    JOIN public.team_members tm ON tm.team_id = m.team_id
                    WHERE m.id = match_attendance.match_id
                    AND tm.user_id = auth.uid()
                    AND tm.role IN ('OWNER', 'MANAGER')
                )
            );
    END IF;
END$$;

-- RLS Policies for team_invites
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'team_invites' AND policyname = 'Anyone can view valid invites'
    ) THEN
        CREATE POLICY "Anyone can view valid invites" ON public.team_invites
            FOR SELECT USING (true);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'team_invites' AND policyname = 'Team managers can create invites'
    ) THEN
        CREATE POLICY "Team managers can create invites" ON public.team_invites
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.team_members tm
                    WHERE tm.team_id = team_invites.team_id
                    AND tm.user_id = auth.uid()
                    AND tm.role IN ('OWNER', 'MANAGER')
                )
            );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'team_invites' AND policyname = 'Team managers can manage invites'
    ) THEN
        CREATE POLICY "Team managers can manage invites" ON public.team_invites
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.team_members tm
                    WHERE tm.team_id = team_invites.team_id
                    AND tm.user_id = auth.uid()
                    AND tm.role IN ('OWNER', 'MANAGER')
                )
            );
    END IF;
END$$;

-- Function to auto-update attendance timestamp
CREATE OR REPLACE FUNCTION public.update_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_attendance_update ON public.match_attendance;
CREATE TRIGGER on_attendance_update
    BEFORE UPDATE ON public.match_attendance
    FOR EACH ROW EXECUTE FUNCTION public.update_attendance_timestamp();
```

## 해결 방법 2: CLI로 Push (Database Password 필요)

```bash
supabase db push
```

프롬프트에서 database password 입력 (Dashboard → Settings → Database에서 확인)

## 적용 후

다시 테스트 데이터 생성 스크립트 실행:
```bash
export $(cat .env | xargs) && npx tsx scripts/populate-test-data.ts
```
