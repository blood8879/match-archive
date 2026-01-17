UPDATE public.teams t 
SET member_count = (
    SELECT COUNT(*) 
    FROM public.team_members tm 
    WHERE tm.team_id = t.id 
    AND tm.status = 'active' 
    AND (tm.is_guest IS NULL OR tm.is_guest = false)
);
