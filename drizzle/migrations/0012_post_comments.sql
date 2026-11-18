CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.hub_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  author text NOT NULL DEFAULT '',
  author_rank text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments(post_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read comments" ON public.post_comments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "write own comments" ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND length(body) BETWEEN 1 AND 500 AND EXISTS (SELECT 1 FROM public.hub_posts h WHERE h.id = post_id));
CREATE POLICY "delete own or staff comments" ON public.post_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.comment_before_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.author := coalesce((SELECT username FROM public.profiles WHERE user_id = NEW.user_id), 'builder');
  NEW.author_rank := public.rank_of(NEW.user_id);
  NEW.body := public.clean_text(btrim(NEW.body));
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER post_comments_before_insert BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.comment_before_insert();