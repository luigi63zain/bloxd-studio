CREATE OR REPLACE FUNCTION public.clean_text(_t text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
declare w text; r text := coalesce(_t, '');
begin
  foreach w in array array['fuck','fucking','fucker','shit','bitch','bastard','asshole','dick','pussy','cunt','whore','slut','fag','faggot','nigger','nigga','retard','motherfucker','bullshit','damn','crap','piss','cock','wanker','twat','dickhead','prick'] loop
    r := regexp_replace(r, '\m' || w || '(s|es|ed|ing)?\M', repeat('*', length(w)), 'gi');
  end loop;
  return r;
end $$;

CREATE TABLE public.hub_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  author text NOT NULL DEFAULT '',
  author_is_owner boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hub_posts TO anon;
GRANT SELECT, INSERT, DELETE ON public.hub_posts TO authenticated;
GRANT ALL ON public.hub_posts TO service_role;
ALTER TABLE public.hub_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read hub posts" ON public.hub_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Signed in users post" ON public.hub_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(body) BETWEEN 1 AND 1000);
CREATE POLICY "Delete own or owner" ON public.hub_posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.hub_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  new.user_id := auth.uid();
  new.author := coalesce((select username from public.profiles where user_id = new.user_id), 'builder');
  new.author_is_owner := public.has_role(new.user_id, 'owner');
  new.body := public.clean_text(btrim(new.body));
  new.created_at := now();
  return new;
end $$;
CREATE TRIGGER hub_posts_before_insert BEFORE INSERT ON public.hub_posts FOR EACH ROW EXECUTE FUNCTION public.hub_before_insert();

CREATE OR REPLACE FUNCTION public.forge_clean()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
  new.title := public.clean_text(new.title);
  new.description := public.clean_text(new.description);
  new.author := public.clean_text(new.author);
  return new;
end $$;
CREATE TRIGGER forge_posts_zz_clean BEFORE INSERT ON public.forge_posts FOR EACH ROW EXECUTE FUNCTION public.forge_clean();

CREATE OR REPLACE FUNCTION public.profile_clean_check()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
  if public.clean_text(new.username) <> new.username then
    raise exception 'That username is not allowed';
  end if;
  return new;
end $$;
CREATE TRIGGER profiles_zz_clean BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profile_clean_check();