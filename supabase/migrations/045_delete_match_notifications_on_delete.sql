CREATE OR REPLACE FUNCTION delete_match_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM notifications
    WHERE related_match_id = OLD.id;
    
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_match_notifications ON matches;
CREATE TRIGGER trigger_delete_match_notifications
    BEFORE DELETE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION delete_match_notifications();
