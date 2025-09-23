-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Service role can manage app settings" ON public.app_settings;

-- Create new policy that allows service role (edge functions) full access
CREATE POLICY "Service role can manage app settings" 
ON public.app_settings 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Also create a policy for authenticated users to read settings if needed
CREATE POLICY "Authenticated users can read app settings" 
ON public.app_settings 
FOR SELECT 
TO authenticated 
USING (true);