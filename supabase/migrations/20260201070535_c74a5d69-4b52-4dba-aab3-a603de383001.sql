-- Create enum for media types
CREATE TYPE public.media_type AS ENUM ('movie', 'series', 'dorama');

-- Create media_links table to store streaming links for TMDB content
CREATE TABLE public.media_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type media_type NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  stream_url TEXT NOT NULL,
  season INTEGER,
  episode INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tmdb_id, media_type, season, episode)
);

-- Enable RLS
ALTER TABLE public.media_links ENABLE ROW LEVEL SECURITY;

-- Everyone can view active media links
CREATE POLICY "Anyone can view active media links"
ON public.media_links
FOR SELECT
USING (is_active = true);

-- Admins can manage all media links
CREATE POLICY "Admins can manage media links"
ON public.media_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_media_links_updated_at
BEFORE UPDATE ON public.media_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create events table for manual event management
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sport TEXT,
  league TEXT,
  team_home TEXT,
  team_away TEXT,
  stream_url TEXT,
  thumbnail TEXT,
  is_live BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Everyone can view active events
CREATE POLICY "Anyone can view active events"
ON public.events
FOR SELECT
USING (is_active = true);

-- Admins can manage all events
CREATE POLICY "Admins can manage events"
ON public.events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();