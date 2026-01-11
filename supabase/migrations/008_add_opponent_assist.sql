-- Add opponent assist support to goals table
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS assist_opponent_id UUID REFERENCES public.opponent_players(id) ON DELETE SET NULL;

-- Update comment
COMMENT ON COLUMN public.goals.assist_member_id IS '도움을 준 우리 팀 선수 ID';
COMMENT ON COLUMN public.goals.assist_opponent_id IS '도움을 준 상대 팀 선수 ID';
