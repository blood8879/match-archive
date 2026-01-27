DELETE FROM public.user_badges WHERE badge_type IN ('streak_5', 'streak_10', 'streak_20');

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
    v_attendance_status TEXT;
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
        SELECT ma.status INTO v_attendance_status
        FROM public.match_attendance ma
        WHERE ma.match_id = v_match.id AND ma.team_member_id = v_team_member_id;

        IF v_attendance_status IS NOT NULL AND v_attendance_status = 'attending' THEN
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

DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN
        SELECT DISTINCT tm.user_id
        FROM public.team_members tm
        WHERE tm.is_guest = FALSE AND tm.user_id IS NOT NULL AND tm.status = 'active'
    LOOP
        PERFORM public.check_and_award_streak_badges(v_user.user_id);
    END LOOP;
END $$;
