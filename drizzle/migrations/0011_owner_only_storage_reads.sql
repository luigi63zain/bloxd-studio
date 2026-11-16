DROP POLICY IF EXISTS "forge file read" ON storage.objects;
CREATE POLICY "forge file read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'forge-files' AND owner_id = (select auth.uid()::text));
DROP POLICY IF EXISTS "post media read" ON storage.objects;
CREATE POLICY "post media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-media' AND owner_id = (select auth.uid()::text));