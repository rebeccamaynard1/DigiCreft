
-- Drop the overly permissive update policy
DROP POLICY "Service role can update orders" ON public.orders;

-- Create a more restrictive update policy
-- Edge functions use service_role key which bypasses RLS entirely,
-- so we don't need an UPDATE policy for them.
-- Users should not be able to update their own orders directly.
