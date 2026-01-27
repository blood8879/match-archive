-- Remove incorrectly awarded streak badges (they were based on total matches, not consecutive)
DELETE FROM public.user_badges WHERE badge_type IN ('streak_5', 'streak_10', 'streak_20');

-- Function to calculate actual consecutive attendance streak for a user in a team
CREATE OR REPLACE FUNCTION public.calculate_attendance_streak(
    p_user_id UUID,
    p_team_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_team_member_id UUID;
    v_current_streak INTEGER := 0;
    v_max_streak INTEGER := 0;
    v_match RECORD;
    v_attended BOOLEAN;
BEGIN
    SELECT id INTO v_team_member_id
    FROM public.team_members
    WHERE user_id = p_user_id AND team_id = p_team_id AND is_guest = FALSE;

    IF v_team_member_id IS NULL THEN
        RETURN 0;
    END IF;

    FOR v_match IN
        SELECT m.id, m.match_date
        FROM public.matches m
        WHERE m.team_id = p_team_id AND m.status = 'FINISHED'
        ORDER BY m.match_date ASC
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM public.match_records mr
            WHERE mr.match_id = v_match.id AND mr.team_member_id = v_team_member_id
        ) INTO v_attended;

        IF v_attended THEN
            v_current_streak := v_current_streak + 1;
            IF v_current_streak > v_max_streak THEN
                v_max_streak := v_current_streak;
            END IF;
        ELSE
            v_current_streak := 0;
        END IF;
    END LOOP;

    RETURN v_max_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award streak badges for a user
CREATE OR REPLACE FUNCTION public.check_and_award_streak_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_team RECORD;
    v_streak INTEGER;
    v_max_streak INTEGER := 0;
BEGIN
    FOR v_team IN
        SELECT DISTINCT tm.team_id
        FROM public.team_members tm
        WHERE tm.user_id = p_user_id AND tm.is_guest = FALSE AND tm.status = 'active'
    LOOP
        v_streak := public.calculate_attendance_streak(p_user_id, v_team.team_id);
        IF v_streak > v_max_streak THEN
            v_max_streak := v_streak;
        END IF;
    END LOOP;

    IF v_max_streak >= 20 THEN
        PERFORM public.award_badge(p_user_id, 'streak_20',
            jsonb_build_object('max_streak', v_max_streak));
    END IF;
    IF v_max_streak >= 10 THEN
        PERFORM public.award_badge(p_user_id, 'streak_10',
            jsonb_build_object('max_streak', v_max_streak));
    END IF;
    IF v_max_streak >= 5 THEN
        PERFORM public.award_badge(p_user_id, 'streak_5',
            jsonb_build_object('max_streak', v_max_streak));
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main badge check function to use correct streak logic
CREATE OR REPLACE FUNCTION public.check_badges_on_match_finish()
RETURNS TRIGGER AS $$
DECLARE
    v_record RECORD;
    v_user_id UUID;
    v_total_goals INTEGER;
    v_total_assists INTEGER;
    v_total_matches INTEGER;
    v_total_mom INTEGER;
    v_account_age_days INTEGER;
BEGIN
    IF NEW.status != 'FINISHED' OR (OLD.status = 'FINISHED') THEN
        RETURN NEW;
    END IF;

    FOR v_record IN
        SELECT mr.*, tm.user_id, tm.is_guest
        FROM public.match_records mr
        JOIN public.team_members tm ON tm.id = mr.team_member_id
        WHERE mr.match_id = NEW.id
    LOOP
        IF v_record.is_guest OR v_record.user_id IS NULL THEN
            CONTINUE;
        END IF;

        v_user_id := v_record.user_id;

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

        IF v_total_goals >= 1 AND v_record.goals > 0 THEN
            PERFORM public.award_badge(v_user_id, 'first_goal',
                jsonb_build_object('match_id', NEW.id, 'goals', v_record.goals));
        END IF;

        IF v_total_assists >= 1 AND v_record.assists > 0 THEN
            PERFORM public.award_badge(v_user_id, 'first_assist',
                jsonb_build_object('match_id', NEW.id, 'assists', v_record.assists));
        END IF;

        IF v_total_mom >= 1 AND v_record.is_mom THEN
            PERFORM public.award_badge(v_user_id, 'first_mom',
                jsonb_build_object('match_id', NEW.id));
        END IF;

        IF v_total_matches >= 100 THEN
            PERFORM public.award_badge(v_user_id, 'matches_100',
                jsonb_build_object('total_matches', v_total_matches));
        END IF;
        IF v_total_matches >= 50 THEN
            PERFORM public.award_badge(v_user_id, 'matches_50',
                jsonb_build_object('total_matches', v_total_matches));
        END IF;
        IF v_total_matches >= 10 THEN
            PERFORM public.award_badge(v_user_id, 'matches_10',
                jsonb_build_object('total_matches', v_total_matches));
        END IF;

        IF v_total_goals >= 50 THEN
            PERFORM public.award_badge(v_user_id, 'goals_50',
                jsonb_build_object('total_goals', v_total_goals));
        END IF;
        IF v_total_goals >= 10 THEN
            PERFORM public.award_badge(v_user_id, 'goals_10',
                jsonb_build_object('total_goals', v_total_goals));
        END IF;

        IF v_total_assists >= 50 THEN
            PERFORM public.award_badge(v_user_id, 'assists_50',
                jsonb_build_object('total_assists', v_total_assists));
        END IF;
        IF v_total_assists >= 10 THEN
            PERFORM public.award_badge(v_user_id, 'assists_10',
                jsonb_build_object('total_assists', v_total_assists));
        END IF;

        PERFORM public.check_and_award_streak_badges(v_user_id);

        SELECT DATE_PART('day', NOW() - u.created_at) INTO v_account_age_days
        FROM public.users u
        WHERE u.id = v_user_id;

        IF v_account_age_days >= 730 THEN
            PERFORM public.award_badge(v_user_id, 'veteran_2year',
                jsonb_build_object('account_age_days', v_account_age_days));
        END IF;
        IF v_account_age_days >= 365 THEN
            PERFORM public.award_badge(v_user_id, 'veteran_1year',
                jsonb_build_object('account_age_days', v_account_age_days));
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill correct streak badges for all users
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN
        SELECT DISTINCT tm.user_id
        FROM public.team_members tm
        WHERE tm.is_guest = FALSE AND tm.user_id IS NOT NULL
    LOOP
        PERFORM public.check_and_award_streak_badges(v_user.user_id);
    END LOOP;
END $$;
