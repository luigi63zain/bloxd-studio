DROP POLICY IF EXISTS "wallets are public" ON public.wallets;
CREATE POLICY "see own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE SELECT ON public.wallets FROM anon;

CREATE OR REPLACE FUNCTION public.public_looks(_ids uuid[])
RETURNS TABLE(user_id uuid, name_color text, badge text, streak int, last_seen timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT w.user_id, w.name_color, w.badge, w.streak, w.last_seen FROM public.wallets w WHERE w.user_id = ANY(_ids) LIMIT 200
$$;

CREATE OR REPLACE FUNCTION public.online_players()
RETURNS TABLE(user_id uuid, username text, name_color text, badge text, streak int, rank text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT w.user_id, p.username, w.name_color, w.badge, w.streak, public.rank_of(w.user_id)
  FROM public.wallets w JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.last_seen > now() - interval '150 seconds'
  ORDER BY w.last_seen DESC LIMIT 50
$$;
GRANT EXECUTE ON FUNCTION public.public_looks(uuid[]), public.online_players() TO anon, authenticated;

DROP POLICY IF EXISTS "post media read" ON storage.objects;
CREATE POLICY "post media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-media' AND owner_id = (select auth.uid()::text));