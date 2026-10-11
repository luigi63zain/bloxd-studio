ALTER TABLE public.hub_posts ADD COLUMN media_path text, ADD COLUMN media_type text CHECK (media_type IN ('image','video')), ADD COLUMN author_rank text NOT NULL DEFAULT '';
ALTER TABLE public.messages ADD COLUMN sender_rank text NOT NULL DEFAULT '';
ALTER TABLE public.forge_posts ADD COLUMN author_rank text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.rank_of(_u uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_u,'owner') THEN 'owner' WHEN public.has_role(_u,'admin') THEN 'coowner' ELSE '' END
$$;

CREATE OR REPLACE FUNCTION public.hub_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  new.user_id := auth.uid();
  new.author := coalesce((select username from public.profiles where user_id = new.user_id), 'builder');
  new.author_is_owner := public.has_role(new.user_id, 'owner');
  new.author_rank := public.rank_of(new.user_id);
  new.body := public.clean_text(btrim(new.body));
  new.created_at := now();
  if new.media_path is not null and split_part(new.media_path, '/', 1) <> new.user_id::text then
    raise exception 'Invalid media';
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.messages_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.sender := auth.uid();
  SELECT username INTO NEW.sender_name FROM public.profiles WHERE user_id = NEW.sender;
  NEW.sender_name := coalesce(NEW.sender_name, 'player');
  NEW.sender_is_owner := public.has_role(NEW.sender, 'owner');
  NEW.sender_rank := public.rank_of(NEW.sender);
  NEW.body := public.clean_text(NEW.body);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.forge_rank() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  new.author_rank := case when new.user_id is null then '' else public.rank_of(new.user_id) end;
  return new;
end $$;
CREATE TRIGGER forge_posts_zz_rank BEFORE INSERT ON public.forge_posts FOR EACH ROW EXECUTE FUNCTION public.forge_rank();

DROP POLICY IF EXISTS "Delete own or owner" ON public.hub_posts;
CREATE POLICY "Delete own or staff" ON public.hub_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.hub_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('gg','fire','diamond','creeper','heart','lol')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);
GRANT SELECT ON public.post_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone sees post reactions" ON public.post_reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "add own post reaction" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "remove own post reaction" ON public.post_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.post_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;

CREATE POLICY "post media read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'post-media');
CREATE POLICY "post media upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);