-- Add alternative stream URLs to channels table
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS stream_url_2 TEXT,
ADD COLUMN IF NOT EXISTS stream_url_3 TEXT;

-- Add alternative stream URLs to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS stream_url_2 TEXT,
ADD COLUMN IF NOT EXISTS stream_url_3 TEXT;