
-- Add pending_url columns for the 30-min staging logic
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pending_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pending_url_2 text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pending_url_3 text;
