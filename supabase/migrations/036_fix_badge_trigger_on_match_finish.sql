-- Fix: Badge trigger should fire when match status changes to FINISHED
-- Previously, badges were only checked on match_records INSERT/UPDATE
-- But stats query filters by match.status = 'FINISHED', and finishing a match
-- only updates the matches table, not match_records - so badges were never awarded!

-- Function to check and award badges for all participants when match is finished
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
    -- Only trigger when status changes to FINISHED
    IF NEW.status != 'FINISHED' OR (OLD.status = 'FINISHED') THEN
        RETURN NEW;
    END IF;

    -- Loop through all match records for this match
    FOR v_record IN
        SELECT mr.*, tm.user_id, tm.is_guest
        FROM public.match_records mr
        JOIN public.team_members tm ON tm.id = mr.team_member_id
        WHERE mr.match_id = NEW.id
    LOOP
        -- Skip guest players
        IF v_record.is_guest OR v_record.user_id IS NULL THEN
            CONTINUE;
        END IF;

        v_user_id := v_record.user_id;

        -- Calculate total stats for the user across all teams (only FINISHED matches)
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
        IF v_total_goals >= 1 AND v_record.goals > 0 THEN
            PERFORM public.award_badge(v_user_id, 'first_goal',
                jsonb_build_object('match_id', NEW.id, 'goals', v_record.goals));
        END IF;

        -- Award first assist badge
        IF v_total_assists >= 1 AND v_record.assists > 0 THEN
            PERFORM public.award_badge(v_user_id, 'first_assist',
                jsonb_build_object('match_id', NEW.id, 'assists', v_record.assists));
        END IF;

        -- Award first MOM badge
        IF v_total_mom >= 1 AND v_record.is_mom THEN
            PERFORM public.award_badge(v_user_id, 'first_mom',
                jsonb_build_object('match_id', NEW.id));
        END IF;

        -- Award match milestone badges (check all milestones, not just exact matches)
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

        -- Award goal milestone badges
        IF v_total_goals >= 50 THEN
            PERFORM public.award_badge(v_user_id, 'goals_50',
                jsonb_build_object('total_goals', v_total_goals));
        END IF;
        IF v_total_goals >= 10 THEN
            PERFORM public.award_badge(v_user_id, 'goals_10',
                jsonb_build_object('total_goals', v_total_goals));
        END IF;

        -- Award assist milestone badges
        IF v_total_assists >= 50 THEN
            PERFORM public.award_badge(v_user_id, 'assists_50',
                jsonb_build_object('total_assists', v_total_assists));
        END IF;
        IF v_total_assists >= 10 THEN
            PERFORM public.award_badge(v_user_id, 'assists_10',
                jsonb_build_object('total_assists', v_total_assists));
        END IF;

        -- Award streak badges (based on total match participation)
        IF v_total_matches >= 20 THEN
            PERFORM public.award_badge(v_user_id, 'streak_20',
                jsonb_build_object('streak_count', v_total_matches));
        END IF;
        IF v_total_matches >= 10 THEN
            PERFORM public.award_badge(v_user_id, 'streak_10',
                jsonb_build_object('streak_count', v_total_matches));
        END IF;
        IF v_total_matches >= 5 THEN
            PERFORM public.award_badge(v_user_id, 'streak_5',
                jsonb_build_object('streak_count', v_total_matches));
        END IF;

        -- Check veteran badges (account age)
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

-- Create trigger on matches table for when status changes to FINISHED
CREATE TRIGGER on_match_finish_badge_check
    AFTER UPDATE ON public.matches
    FOR EACH ROW 
    WHEN (NEW.status = 'FINISHED' AND OLD.status IS DISTINCT FROM 'FINISHED')
    EXECUTE FUNCTION public.check_badges_on_match_finish();

-- Comment
COMMENT ON FUNCTION public.check_badges_on_match_finish IS 
'Awards badges to all participants when a match is finished. This is the main trigger for badge awards since match_records are inserted before the match is finished.';

-- Also add trigger for direct FINISHED inserts (edge case: importing finished matches)
CREATE TRIGGER on_match_insert_finished_badge_check
    AFTER INSERT ON public.matches
    FOR EACH ROW 
    WHEN (NEW.status = 'FINISHED')
    EXECUTE FUNCTION public.check_badges_on_match_finish();
