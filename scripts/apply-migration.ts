/**
 * Service Role Key를 사용하여 마이그레이션 SQL을 직접 실행
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const migrationSQL = `
-- Add attendance status type
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('attending', 'maybe', 'absent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Match attendance tracking
CREATE TABLE IF NOT EXISTS public.match_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'maybe',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(match_id, team_member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_attendance_match ON public.match_attendance(match_id);
CREATE INDEX IF NOT EXISTS idx_match_attendance_member ON public.match_attendance(team_member_id);

-- Enable RLS
ALTER TABLE public.match_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view match attendance" ON public.match_attendance;
DROP POLICY IF EXISTS "Team members can update own attendance" ON public.match_attendance;
DROP POLICY IF EXISTS "Team members can update own attendance status" ON public.match_attendance;

-- RLS Policies
CREATE POLICY "Anyone can view match attendance" ON public.match_attendance FOR SELECT USING (true);

CREATE POLICY "Team members can update own attendance" ON public.match_attendance FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.matches m ON m.team_id = tm.team_id
        WHERE tm.id = match_attendance.team_member_id
        AND m.id = match_attendance.match_id
        AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "Team members can update own attendance status" ON public.match_attendance FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = match_attendance.team_member_id
        AND tm.user_id = auth.uid()
    )
);

-- Trigger function
CREATE OR REPLACE FUNCTION public.update_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_attendance_update ON public.match_attendance;
CREATE TRIGGER on_attendance_update
    BEFORE UPDATE ON public.match_attendance
    FOR EACH ROW EXECUTE FUNCTION public.update_attendance_timestamp();
`;

async function applyMigration() {
  console.log("🔄 마이그레이션 적용 중...\n");

  try {
    const { data, error } = await supabase.rpc("exec_sql", { query: migrationSQL });

    if (error) {
      // RPC 함수가 없으면 직접 실행 시도
      console.log("⚠️  exec_sql RPC가 없습니다. Postgres API로 시도...\n");

      // Supabase의 REST API는 직접 SQL 실행을 지원하지 않습니다
      // 대신 각 작업을 개별적으로 수행해야 합니다
      console.log("❌ Supabase REST API는 직접 SQL 실행을 지원하지 않습니다.");
      console.log("\n다음 방법 중 하나를 사용하세요:");
      console.log("\n1. Supabase Dashboard에서 SQL Editor 사용:");
      console.log("   https://supabase.com/dashboard/project/maulhqmrvdyanywasahc/sql/new");
      console.log("\n2. psql로 직접 연결 (Database Password 필요):");
      console.log("   supabase db push\n");

      process.exit(1);
    }

    console.log("✅ 마이그레이션 적용 완료!");
    console.log(data);
  } catch (error) {
    console.error("❌ 마이그레이션 적용 실패:", error);
    process.exit(1);
  }
}

applyMigration();
