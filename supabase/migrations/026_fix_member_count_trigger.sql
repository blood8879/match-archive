-- Fix member_count trigger to handle 'active' → 'left' status change
CREATE OR REPLACE FUNCTION public.update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' AND (NEW.is_guest IS NULL OR NEW.is_guest = false) THEN
        UPDATE public.teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' AND (OLD.is_guest IS NULL OR OLD.is_guest = false) THEN
        UPDATE public.teams SET member_count = member_count - 1 WHERE id = OLD.team_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes for non-guest members only
        IF (OLD.is_guest IS NULL OR OLD.is_guest = false) AND (NEW.is_guest IS NULL OR NEW.is_guest = false) THEN
            -- From non-active to active: increment
            IF OLD.status != 'active' AND NEW.status = 'active' THEN
                UPDATE public.teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
            -- From active to non-active (left, pending, etc.): decrement
            ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
                UPDATE public.teams SET member_count = member_count - 1 WHERE id = NEW.team_id;
            END IF;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
