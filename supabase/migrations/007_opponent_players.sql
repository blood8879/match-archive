-- 007_opponent_players.sql
-- 상대팀 선수 관리를 위한 테이블 생성

-- opponent_players 테이블 생성
CREATE TABLE IF NOT EXISTS public.opponent_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    number INTEGER,
    position TEXT CHECK (position IN ('FW', 'MF', 'DF', 'GK')),
    is_playing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_opponent_players_match_id ON public.opponent_players(match_id);

-- goals 테이블에 opponent_player_id 컬럼 추가
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS opponent_player_id UUID REFERENCES public.opponent_players(id) ON DELETE SET NULL;

-- goals 테이블에 team 구분 컬럼 추가 (HOME: 우리팀, AWAY: 상대팀)
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS scoring_team TEXT DEFAULT 'HOME' CHECK (scoring_team IN ('HOME', 'AWAY'));

-- RLS 정책 설정
ALTER TABLE public.opponent_players ENABLE ROW LEVEL SECURITY;

-- opponent_players 조회 정책: 경기가 속한 팀의 멤버만 조회 가능
CREATE POLICY "Team members can view opponent players"
ON public.opponent_players
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        INNER JOIN public.team_members tm ON tm.team_id = m.team_id
        WHERE m.id = opponent_players.match_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
);

-- opponent_players 삽입 정책: 경기가 속한 팀의 OWNER/MANAGER만 가능
CREATE POLICY "Team managers can insert opponent players"
ON public.opponent_players
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.matches m
        INNER JOIN public.team_members tm ON tm.team_id = m.team_id
        WHERE m.id = opponent_players.match_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('OWNER', 'MANAGER')
    )
);

-- opponent_players 수정 정책: 경기가 속한 팀의 OWNER/MANAGER만 가능
CREATE POLICY "Team managers can update opponent players"
ON public.opponent_players
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        INNER JOIN public.team_members tm ON tm.team_id = m.team_id
        WHERE m.id = opponent_players.match_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('OWNER', 'MANAGER')
    )
);

-- opponent_players 삭제 정책: 경기가 속한 팀의 OWNER/MANAGER만 가능
CREATE POLICY "Team managers can delete opponent players"
ON public.opponent_players
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        INNER JOIN public.team_members tm ON tm.team_id = m.team_id
        WHERE m.id = opponent_players.match_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('OWNER', 'MANAGER')
    )
);

-- 기존 goals에 대한 기본값 설정 (모두 HOME팀 득점으로)
UPDATE public.goals SET scoring_team = 'HOME' WHERE scoring_team IS NULL;
