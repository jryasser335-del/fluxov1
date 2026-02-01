-- Add platform column to media_links table
ALTER TABLE public.media_links 
ADD COLUMN platform text DEFAULT NULL;

-- Create index for platform filtering
CREATE INDEX idx_media_links_platform ON public.media_links(platform);