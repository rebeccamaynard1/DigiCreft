-- Remove the overly permissive public INSERT policy on the generated-products bucket.
-- The service_role used by edge functions bypasses RLS, so no replacement policy is needed.
DROP POLICY IF EXISTS "Service upload access" ON storage.objects;