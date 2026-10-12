DROP POLICY IF EXISTS "post media read" ON storage.objects;
CREATE POLICY "post media read" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'post-media' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.hub_posts h WHERE h.media_path = storage.objects.name)
  )
);