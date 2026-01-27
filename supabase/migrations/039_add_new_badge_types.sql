-- Add new badge types: hat_trick, poker, iron_man
ALTER TABLE public.user_badges DROP CONSTRAINT valid_badge_type;

ALTER TABLE public.user_badges ADD CONSTRAINT valid_badge_type CHECK (
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
        'assists_50',
        'hat_trick',
        'poker',
        'iron_man'
    )
);

CREATE OR REPLACE FUNCTION public.check_iron_man_badge(
    p_user_id UUID,
    p_team_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_year INTEGER;
    v_team_matches INTEGER;
    v_user_matches INTEGER;
    v_team_member_id UUID;
BEGIN
    SELECT id INTO v_team_member_id
    FROM public.team_members
    WHERE user_id = p_user_id AND team_id = p_team_id AND is_guest = FALSE;

    IF v_team_member_id IS NULL THEN
        RETURN;
    END IF;

    FOR v_year IN
        SELECT DISTINCT EXTRACT(YEAR FROM m.match_date)::INTEGER
        FROM public.matches m
        WHERE m.team_id = p_team_id AND m.status = 'FINISHED'
    LOOP
        SELECT COUNT(*) INTO v_team_matches
        FROM public.matches m
        WHERE m.team_id = p_team_id 
        AND m.status = 'FINISHED'
        AND EXTRACT(YEAR FROM m.match_date) = v_year;

        IF v_team_matches < 5 THEN
            CONTINUE;
        END IF;

        SELECT COUNT(*) INTO v_user_matches
        FROM public.match_records mr
        JOIN public.matches m ON m.id = mr.match_id
        WHERE mr.team_member_id = v_team_member_id
        AND m.status = 'FINISHED'
        AND EXTRACT(YEAR FROM m.match_date) = v_year;

        IF v_user_matches = v_team_matches THEN
            PERFORM public.award_badge(p_user_id, 'iron_man',
                jsonb_build_object('year', v_year, 'team_id', p_team_id, 'matches', v_team_matches));
            RETURN;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

        IF v_record.goals >= 4 THEN
            PERFORM public.award_badge(v_user_id, 'poker',
                jsonb_build_object('match_id', NEW.id, 'goals', v_record.goals));
        END IF;

        IF v_record.goals >= 3 THEN
            PERFORM public.award_badge(v_user_id, 'hat_trick',
                jsonb_build_object('match_id', NEW.id, 'goals', v_record.goals));
        END IF;

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

        PERFORM public.check_iron_man_badge(v_user_id, NEW.team_id);

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

DO $$
DECLARE
    v_record RECORD;
BEGIN
    FOR v_record IN
        SELECT mr.match_id, mr.goals, tm.user_id
        FROM public.match_records mr
        JOIN public.team_members tm ON tm.id = mr.team_member_id
        JOIN public.matches m ON m.id = mr.match_id
        WHERE tm.is_guest = FALSE 
        AND tm.user_id IS NOT NULL
        AND m.status = 'FINISHED'
        AND mr.goals >= 3
    LOOP
        IF v_record.goals >= 4 THEN
            PERFORM public.award_badge(v_record.user_id, 'poker',
                jsonb_build_object('match_id', v_record.match_id, 'goals', v_record.goals, 'backfilled', true));
        END IF;
        IF v_record.goals >= 3 THEN
            PERFORM public.award_badge(v_record.user_id, 'hat_trick',
                jsonb_build_object('match_id', v_record.match_id, 'goals', v_record.goals, 'backfilled', true));
        END IF;
    END LOOP;

    FOR v_record IN
        SELECT DISTINCT tm.user_id, tm.team_id
        FROM public.team_members tm
        WHERE tm.is_guest = FALSE AND tm.user_id IS NOT NULL
    LOOP
        PERFORM public.check_iron_man_badge(v_record.user_id, v_record.team_id);
    END LOOP;
END $$;
