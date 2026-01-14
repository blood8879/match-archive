-- Add soft delete functionality to venues table
-- This allows venues to be marked as deleted without losing historical data

-- Add deleted_at column for soft delete
ALTER TABLE public.venues ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add index on deleted_at for query performance
CREATE INDEX idx_venues_deleted_at ON public.venues(deleted_at);

-- Update the primary venue constraint to only consider non-deleted venues
-- Drop existing trigger and function, then recreate with deleted_at check
DROP TRIGGER IF EXISTS on_venue_primary_change ON public.venues;
DROP FUNCTION IF EXISTS public.ensure_single_primary_venue();

-- Recreate function with deleted_at check
CREATE OR REPLACE FUNCTION public.ensure_single_primary_venue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true AND NEW.deleted_at IS NULL THEN
        -- Only update other non-deleted venues
        UPDATE public.venues
        SET is_primary = false
        WHERE team_id = NEW.team_id
        AND id != NEW.id
        AND is_primary = true
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger for primary venue constraint
CREATE TRIGGER on_venue_primary_change
    BEFORE INSERT OR UPDATE ON public.venues
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION public.ensure_single_primary_venue();

-- Update existing index to consider only non-deleted venues
DROP INDEX IF EXISTS idx_venues_is_primary;
CREATE INDEX idx_venues_is_primary ON public.venues(team_id, is_primary) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted venues by default
-- Drop existing SELECT policy and recreate with deleted_at check
DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;

-- Allow viewing all venues (including deleted ones) for historical data in match records
-- The application layer (services) will filter out deleted venues when listing for selection
CREATE POLICY "Anyone can view all venues" ON public.venues
    FOR SELECT USING (true);

-- Note: INSERT, UPDATE, DELETE policies remain the same
-- Soft delete should be implemented via UPDATE that sets deleted_at = NOW()
