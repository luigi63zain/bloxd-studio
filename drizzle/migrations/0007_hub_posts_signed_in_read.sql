DROP POLICY IF EXISTS "Anyone can read hub posts" ON public.hub_posts;
CREATE POLICY "Signed in users read hub posts" ON public.hub_posts FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.hub_posts FROM anon;