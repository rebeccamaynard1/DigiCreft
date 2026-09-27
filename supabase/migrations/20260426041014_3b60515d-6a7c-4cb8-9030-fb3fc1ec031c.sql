-- Make the generated-products bucket private
UPDATE storage.buckets SET public = false WHERE id = 'generated-products';

-- Drop the wide-open public SELECT policy
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- Owner-scoped SELECT: files are stored under "<user_id>/<order_id>.md"
-- so the first path segment must equal auth.uid().
CREATE POLICY "Users can read own generated files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-products'
  AND (storage.foldername(name))[1] = auth.uid()::text
);