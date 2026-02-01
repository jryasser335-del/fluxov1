-- Add espn_id column to events table for linking ESPN events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS espn_id text UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_espn_id ON public.events(espn_id);