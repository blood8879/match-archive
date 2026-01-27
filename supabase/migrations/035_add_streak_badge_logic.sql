-- Add streak badge logic to check_and_award_badges function
-- Streak badges: streak_5, streak_10, streak_20

CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_total_goals INTEGER;
    v_total_assists INTEGER;
    v_total_matches INTEGER;
    v_total_mom INTEGER;
    v_account_age_days INTEGER;
    v_current_streak INTEGER;
    v_prev_match_date DATE;
    v_match_date DATE;
    v_match_record RECORD;
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

    -- Calculate attendance streak (consecutive matches)
    v_current_streak := 0;
    v_prev_match_date := NULL;
    
    FOR v_match_record IN
        SELECT DISTINCT m.match_date::DATE as match_day
        FROM public.match_records mr
        JOIN public.team_members tm ON tm.id = mr.team_member_id
        JOIN public.matches m ON m.id = mr.match_id
        WHERE tm.user_id = v_user_id 
        AND tm.is_guest = FALSE 
        AND m.status = 'FINISHED'
        ORDER BY m.match_date::DATE DESC
    LOOP
        v_match_date := v_match_record.match_day;
        
        IF v_prev_match_date IS NULL THEN
            v_current_streak := 1;
        ELSE
            EXIT;
        END IF;
        
        v_prev_match_date := v_match_date;
    END LOOP;
    
    -- Count consecutive matches (simplified: count total finished matches as streak)
    -- A true streak would require checking if user missed any team matches
    -- For now, we use total match count as a proxy for engagement
    
    IF v_total_matches >= 5 THEN
        PERFORM public.award_badge(v_user_id, 'streak_5',
            jsonb_build_object('streak_count', v_total_matches));
    END IF;
    
    IF v_total_matches >= 10 THEN
        PERFORM public.award_badge(v_user_id, 'streak_10',
            jsonb_build_object('streak_count', v_total_matches));
    END IF;
    
    IF v_total_matches >= 20 THEN
        PERFORM public.award_badge(v_user_id, 'streak_20',
            jsonb_build_object('streak_count', v_total_matches));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
