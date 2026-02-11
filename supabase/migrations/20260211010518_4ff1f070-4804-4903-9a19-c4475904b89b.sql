
-- Table to store scraped live stream links (admin-only)
CREATE TABLE public.live_scraped_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id text NOT NULL,
  match_title text NOT NULL,
  category text,
  team_home text,
  team_away text,
  source_admin text,
  source_delta text,
  source_echo text,
  source_golf text,
  scanned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_scraped_links ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can do everything with scraped links"
  ON public.live_scraped_links
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add unique constraint on match_id to avoid duplicates per scan
CREATE UNIQUE INDEX idx_live_scraped_links_match_id ON public.live_scraped_links (match_id);
