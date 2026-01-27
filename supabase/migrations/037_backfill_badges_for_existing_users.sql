-- Backfill badges for existing users who have stats but never received badges
-- This is a one-time migration to award badges that should have been awarded

DO $$
DECLARE
    v_record RECORD;
    v_total_goals INTEGER;
    v_total_assists INTEGER;
    v_total_matches INTEGER;
    v_total_mom INTEGER;
    v_account_age_days INTEGER;
BEGIN
    FOR v_record IN
        SELECT DISTINCT tm.user_id
        FROM public.match_records mr
        JOIN public.team_members tm ON tm.id = mr.team_member_id
        JOIN public.matches m ON m.id = mr.match_id
        WHERE tm.is_guest = FALSE 
        AND tm.user_id IS NOT NULL
        AND m.status = 'FINISHED'
    LOOP
        SELECT
            COALESCE(SUM(mr.goals), 0),
            COALESCE(SUM(mr.assists), 0),
            COUNT(DISTINCT mr.match_id),
            COALESCE(SUM(CASE WHEN mr.is_mom THEN 1 ELSE 0 END), 0)
        INTO v_total_goals, v_total_assists, v_total_matches, v_total_mom
        FROM public.match_records mr
        JOIN public.team_members tm ON tm.id = mr.team_member_id
        JOIN public.matches m ON m.id = mr.match_id
        WHERE tm.user_id = v_record.user_id AND tm.is_guest = FALSE AND m.status = 'FINISHED';

        IF v_total_goals >= 1 THEN
            PERFORM public.award_badge(v_record.user_id, 'first_goal',
                jsonb_build_object('total_goals', v_total_goals, 'backfilled', true));
        END IF;

        IF v_total_assists >= 1 THEN
            PERFORM public.award_badge(v_record.user_id, 'first_assist',
                jsonb_build_object('total_assists', v_total_assists, 'backfilled', true));
        END IF;

        IF v_total_mom >= 1 THEN
            PERFORM public.award_badge(v_record.user_id, 'first_mom',
                jsonb_build_object('total_mom', v_total_mom, 'backfilled', true));
        END IF;

        IF v_total_matches >= 100 THEN
            PERFORM public.award_badge(v_record.user_id, 'matches_100',
                jsonb_build_object('total_matches', v_total_matches, 'backfilled', true));
        END IF;
        IF v_total_matches >= 50 THEN
            PERFORM public.award_badge(v_record.user_id, 'matches_50',
                jsonb_build_object('total_matches', v_total_matches, 'backfilled', true));
        END IF;
        IF v_total_matches >= 10 THEN
            PERFORM public.award_badge(v_record.user_id, 'matches_10',
                jsonb_build_object('total_matches', v_total_matches, 'backfilled', true));
        END IF;

        IF v_total_goals >= 50 THEN
            PERFORM public.award_badge(v_record.user_id, 'goals_50',
                jsonb_build_object('total_goals', v_total_goals, 'backfilled', true));
        END IF;
        IF v_total_goals >= 10 THEN
            PERFORM public.award_badge(v_record.user_id, 'goals_10',
                jsonb_build_object('total_goals', v_total_goals, 'backfilled', true));
        END IF;

        IF v_total_assists >= 50 THEN
            PERFORM public.award_badge(v_record.user_id, 'assists_50',
                jsonb_build_object('total_assists', v_total_assists, 'backfilled', true));
        END IF;
        IF v_total_assists >= 10 THEN
            PERFORM public.award_badge(v_record.user_id, 'assists_10',
                jsonb_build_object('total_assists', v_total_assists, 'backfilled', true));
        END IF;

        IF v_total_matches >= 20 THEN
            PERFORM public.award_badge(v_record.user_id, 'streak_20',
                jsonb_build_object('streak_count', v_total_matches, 'backfilled', true));
        END IF;
        IF v_total_matches >= 10 THEN
            PERFORM public.award_badge(v_record.user_id, 'streak_10',
                jsonb_build_object('streak_count', v_total_matches, 'backfilled', true));
        END IF;
        IF v_total_matches >= 5 THEN
            PERFORM public.award_badge(v_record.user_id, 'streak_5',
                jsonb_build_object('streak_count', v_total_matches, 'backfilled', true));
        END IF;

        SELECT DATE_PART('day', NOW() - u.created_at) INTO v_account_age_days
        FROM public.users u
        WHERE u.id = v_record.user_id;

        IF v_account_age_days >= 730 THEN
            PERFORM public.award_badge(v_record.user_id, 'veteran_2year',
                jsonb_build_object('account_age_days', v_account_age_days, 'backfilled', true));
        END IF;
        IF v_account_age_days >= 365 THEN
            PERFORM public.award_badge(v_record.user_id, 'veteran_1year',
                jsonb_build_object('account_age_days', v_account_age_days, 'backfilled', true));
        END IF;
    END LOOP;

    RAISE NOTICE 'Badge backfill completed';
END $$;
