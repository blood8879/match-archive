CREATE OR REPLACE FUNCTION notify_match_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_name TEXT;
    v_match_date TEXT;
    v_opponent TEXT;
    v_member RECORD;
BEGIN
    SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;
    
    v_match_date := TO_CHAR(NEW.match_date::DATE, 'YYYY-MM-DD');
    v_opponent := COALESCE(NEW.opponent_name, '미정');

    FOR v_member IN
        SELECT tm.user_id
        FROM team_members tm
        WHERE tm.team_id = NEW.team_id
        AND tm.status = 'active'
        AND tm.is_guest = FALSE
        AND tm.user_id IS NOT NULL
    LOOP
        PERFORM create_notification(
            v_member.user_id,
            'match_created',
            '새로운 경기 등록',
            v_team_name || ' vs ' || v_opponent || ' (' || v_match_date || ')',
            NEW.team_id,
            NULL,
            NULL,
            NEW.id,
            jsonb_build_object('match_date', v_match_date, 'opponent', v_opponent)
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_match_created ON matches;
CREATE TRIGGER trigger_notify_match_created
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION notify_match_created();
