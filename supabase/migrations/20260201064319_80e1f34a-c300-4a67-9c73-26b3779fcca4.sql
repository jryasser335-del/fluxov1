-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create channels table
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo TEXT,
  stream TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Everyone can view active channels
CREATE POLICY "Anyone can view active channels"
ON public.channels
FOR SELECT
USING (is_active = true);

-- Admins can manage all channels
CREATE POLICY "Admins can manage channels"
ON public.channels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for channels
CREATE TRIGGER update_channels_updated_at
BEFORE UPDATE ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial channels data
INSERT INTO public.channels (key, name, logo, stream, sort_order) VALUES
  ('espn', 'ESPN', 'https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg', 'https://lcrj3.envivoslatam.org/espnpremium/tracks-v1a1/mono.m3u8?ip=108.29.21.29&token=9bd484fe9a08d4e894e065b722a88645e15e62e6-3f-1769964985-1769910985', 1),
  ('espn2', 'ESPN 2', 'https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg', '', 2),
  ('foxsports', 'Fox Sports', 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Fox_Sports_logo.svg', 'https://deportes.ksdjugfsddeports.com:9092/MTA4LjI5LjIxLjI5/8_.m3u8?token=Iaorv6-BVReqDlHaTeNJAA&expires=1769952623', 3),
  ('tnt', 'TNT Sports', 'https://upload.wikimedia.org/wikipedia/commons/8/8b/TNT_Logo_2016.svg', 'https://lcrj3.envivoslatam.org/tntsports/tracks-v1a1/mono.m3u8?ip=108.29.21.29&token=78871955623f87352b03d2b0e3ddb3ec96b118b8-59-1769965044-1769911044', 4),
  ('dazn', 'DAZN', 'https://upload.wikimedia.org/wikipedia/commons/6/6c/DAZN_Logo.svg', '', 5),
  ('nbatv', 'NBA TV', 'https://upload.wikimedia.org/wikipedia/commons/3/3f/NBA_TV.svg', 'https://amg00556-amg00556c3-firetv-us-6060.playouts.now.amagi.tv/playlist720p.m3u8', 6),
  ('ufcpass', 'UFC Fight Pass', 'https://upload.wikimedia.org/wikipedia/commons/0/0c/UFC_Fight_Pass_logo.svg', '', 7),
  ('univision', 'Univision', 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Univision_2019_logo.svg', 'https://streaming-live-fcdn.api.prd.univisionnow.com/wltv/wltv.isml/hls/wltv-audio_eng=128000-video=4000000.m3u8', 8),
  ('telemundo', 'Telemundo', 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Telemundo_logo_2018.svg', 'https://dvrfl03.bozztv.com/hondu-telexitos/tracks-v1a1/mono.ts.m3u8', 9);