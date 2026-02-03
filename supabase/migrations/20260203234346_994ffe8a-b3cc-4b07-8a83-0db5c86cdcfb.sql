-- Create app_users table for custom user accounts managed by admin
CREATE TABLE public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    days_remaining INTEGER NOT NULL DEFAULT 30,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage app_users
CREATE POLICY "Admins can do everything with app_users"
ON public.app_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_app_users_updated_at
BEFORE UPDATE ON public.app_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_app_users_username ON public.app_users(username);
CREATE INDEX idx_app_users_expires_at ON public.app_users(expires_at);