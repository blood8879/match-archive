-- Create user_badges table
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT valid_badge_type CHECK (
        badge_type IN (
            'first_goal',
            'first_assist',
            'first_mom',
            'streak_5',
            'streak_10',
            'streak_20',
            'team_founder',
            'multi_team_5',
            'veteran_1year',
            'veteran_2year',
            'matches_10',
            'matches_50',
            'matches_100',
            'goals_10',
            'goals_50',
            'assists_10',
            'assists_50'
        )
    ),
    UNIQUE(user_id, badge_type)
);

-- Create indexes for performance
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_badge_type ON public.user_badges(badge_type);
CREATE INDEX idx_user_badges_earned_at ON public.user_badges(earned_at);

-- Enable Row Level Security
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own badges
CREATE POLICY "Users can view own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can view other users' badges
CREATE POLICY "Users can view public badges" ON public.user_badges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = user_badges.user_id
        )
    );

-- RLS Policy: System can insert badges (will be used by backend/triggers)
CREATE POLICY "System can insert badges" ON public.user_badges
    FOR INSERT WITH CHECK (true);

-- Function to award badge to user (idempotent)
CREATE OR REPLACE FUNCTION public.award_badge(
    p_user_id UUID,
    p_badge_type TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_badge_id UUID;
BEGIN
    -- Insert badge if not already awarded
    INSERT INTO public.user_badges (user_id, badge_type, metadata)
    VALUES (p_user_id, p_badge_type, p_metadata)
    ON CONFLICT (user_id, badge_type) DO NOTHING
    RETURNING id INTO v_badge_id;

    RETURN v_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award milestone badges after match record insert/update
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_total_goals INTEGER;
    v_total_assists INTEGER;
    v_total_matches INTEGER;
    v_total_mom INTEGER;
    v_account_age_days INTEGER;
BEGIN
    -- Get user_id from team_member
    SELECT tm.user_id INTO v_user_id
    FROM public.team_members tm
    WHERE tm.id = NEW.team_member_id AND tm.is_guest = FALSE;

    -- Skip if guest player
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate total stats for the user across all teams
    SELECT
        COALESCE(SUM(mr.goals), 0),
        COALESCE(SUM(mr.assists), 0),
        COUNT(DISTINCT mr.match_id),
        COALESCE(SUM(CASE WHEN mr.is_mom THEN 1 ELSE 0 END), 0)
    INTO v_total_goals, v_total_assists, v_total_matches, v_total_mom
    FROM public.match_records mr
    JOIN public.team_members tm ON tm.id = mr.team_member_id
    JOIN public.matches m ON m.id = mr.match_id
    WHERE tm.user_id = v_user_id AND tm.is_guest = FALSE AND m.status = 'FINISHED';

    -- Award first goal badge
    IF v_total_goals = 1 AND NEW.goals > 0 THEN
        PERFORM public.award_badge(v_user_id, 'first_goal',
            jsonb_build_object('match_id', NEW.match_id, 'goals', NEW.goals));
    END IF;

    -- Award first assist badge
    IF v_total_assists = 1 AND NEW.assists > 0 THEN
        PERFORM public.award_badge(v_user_id, 'first_assist',
            jsonb_build_object('match_id', NEW.match_id, 'assists', NEW.assists));
    END IF;

    -- Award first MOM badge
    IF v_total_mom = 1 AND NEW.is_mom THEN
        PERFORM public.award_badge(v_user_id, 'first_mom',
            jsonb_build_object('match_id', NEW.match_id));
    END IF;

    -- Award match milestone badges
    IF v_total_matches = 10 THEN
        PERFORM public.award_badge(v_user_id, 'matches_10',
            jsonb_build_object('total_matches', v_total_matches));
    ELSIF v_total_matches = 50 THEN
        PERFORM public.award_badge(v_user_id, 'matches_50',
            jsonb_build_object('total_matches', v_total_matches));
    ELSIF v_total_matches = 100 THEN
        PERFORM public.award_badge(v_user_id, 'matches_100',
            jsonb_build_object('total_matches', v_total_matches));
    END IF;

    -- Award goal milestone badges
    IF v_total_goals = 10 THEN
        PERFORM public.award_badge(v_user_id, 'goals_10',
            jsonb_build_object('total_goals', v_total_goals));
    ELSIF v_total_goals = 50 THEN
        PERFORM public.award_badge(v_user_id, 'goals_50',
            jsonb_build_object('total_goals', v_total_goals));
    END IF;

    -- Award assist milestone badges
    IF v_total_assists = 10 THEN
        PERFORM public.award_badge(v_user_id, 'assists_10',
            jsonb_build_object('total_assists', v_total_assists));
    ELSIF v_total_assists = 50 THEN
        PERFORM public.award_badge(v_user_id, 'assists_50',
            jsonb_build_object('total_assists', v_total_assists));
    END IF;

    -- Check veteran badges (account age)
    SELECT DATE_PART('day', NOW() - u.created_at) INTO v_account_age_days
    FROM public.users u
    WHERE u.id = v_user_id;

    IF v_account_age_days >= 365 THEN
        PERFORM public.award_badge(v_user_id, 'veteran_1year',
            jsonb_build_object('account_age_days', v_account_age_days));
    END IF;

    IF v_account_age_days >= 730 THEN
        PERFORM public.award_badge(v_user_id, 'veteran_2year',
            jsonb_build_object('account_age_days', v_account_age_days));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check and award badges after match record changes
CREATE TRIGGER on_match_record_badge_check
    AFTER INSERT OR UPDATE ON public.match_records
    FOR EACH ROW EXECUTE FUNCTION public.check_and_award_badges();

-- Function to check and award team-related badges
CREATE OR REPLACE FUNCTION public.check_and_award_team_badges()
RETURNS TRIGGER AS $$
DECLARE
    v_team_count INTEGER;
BEGIN
    -- Skip if guest member
    IF NEW.is_guest THEN
        RETURN NEW;
    END IF;

    -- Award team founder badge (team owner)
    IF NEW.role = 'OWNER' AND NEW.status = 'active' THEN
        PERFORM public.award_badge(NEW.user_id, 'team_founder',
            jsonb_build_object('team_id', NEW.team_id));
    END IF;

    -- Check multi-team badge (5+ active teams)
    IF NEW.status = 'active' THEN
        SELECT COUNT(DISTINCT tm.team_id) INTO v_team_count
        FROM public.team_members tm
        WHERE tm.user_id = NEW.user_id
        AND tm.is_guest = FALSE
        AND tm.status = 'active';

        IF v_team_count >= 5 THEN
            PERFORM public.award_badge(NEW.user_id, 'multi_team_5',
                jsonb_build_object('team_count', v_team_count));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check and award team badges
CREATE TRIGGER on_team_member_badge_check
    AFTER INSERT OR UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION public.check_and_award_team_badges();

-- Comment on table and columns
COMMENT ON TABLE public.user_badges IS 'Stores user achievement badges';
COMMENT ON COLUMN public.user_badges.badge_type IS 'Type of badge: first_goal, first_assist, first_mom, streak_5, streak_10, streak_20, team_founder, multi_team_5, veteran_1year, veteran_2year, matches_10, matches_50, matches_100, goals_10, goals_50, assists_10, assists_50';
COMMENT ON COLUMN public.user_badges.metadata IS 'Additional information about when/how the badge was earned (e.g., match_id, total count)';
