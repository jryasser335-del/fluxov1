-- Add policy for app users to login (verify their own credentials)
-- This allows the login function to query by username
CREATE POLICY "Allow login verification"
ON public.app_users
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: The write operations are still restricted to admins only