ALTER TABLE public.forge_posts DROP CONSTRAINT forge_posts_kind_check;
ALTER TABLE public.forge_posts ADD CONSTRAINT forge_posts_kind_check CHECK (kind IN ('code','schematic','texture'));
ALTER TABLE public.forge_posts ADD COLUMN file_path text, ADD COLUMN file_name text;
CREATE TABLE public.coin_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient uuid NOT NULL, actor uuid NOT NULL,
 source_id uuid, action text NOT NULL CHECK (action IN ('reaction','use','remix','gift')), amount integer NOT NULL CHECK(amount > 0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(actor,source_id,action)
);
GRANT SELECT ON public.coin_events TO authenticated;
GRANT ALL ON public.coin_events TO service_role;
ALTER TABLE public.coin_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own coin events" ON public.coin_events FOR SELECT TO authenticated USING (recipient=auth.uid() OR actor=auth.uid() OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.gift_coins(_username text, _amount integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid; balance integer;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Only owners and co-owners can give ULTRACOINS'; END IF;
 IF _amount IS NULL OR _amount < 1 OR _amount > 1000000 THEN RAISE EXCEPTION 'Enter 1 to 1000000 ULTRACOINS'; END IF;
 SELECT user_id INTO target FROM public.profiles WHERE lower(username)=lower(btrim(_username));
 IF target IS NULL THEN RAISE EXCEPTION 'Username not found'; END IF;
 INSERT INTO public.wallets(user_id) VALUES(target) ON CONFLICT DO NOTHING;
 UPDATE public.wallets SET coins=coins+_amount WHERE user_id=target RETURNING coins INTO balance;
 INSERT INTO public.coin_events(recipient,actor,action,amount) VALUES(target,auth.uid(),'gift',_amount);
 RETURN balance;
END $$;
REVOKE ALL ON FUNCTION public.gift_coins(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gift_coins(text,integer) TO authenticated;
CREATE FUNCTION public.record_forge_action(_post uuid,_action text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid; reward integer; inserted uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF _action NOT IN ('use','remix') OR _action IS NULL THEN RAISE EXCEPTION 'Invalid action'; END IF;
 SELECT user_id INTO target FROM public.forge_posts WHERE id=_post;
 IF NOT FOUND THEN RAISE EXCEPTION 'Creation not found'; END IF;
 IF target IS NULL OR target=auth.uid() THEN RETURN false; END IF;
 reward := CASE WHEN _action='use' THEN 2 ELSE 5 END;
 INSERT INTO public.coin_events(recipient,actor,source_id,action,amount) VALUES(target,auth.uid(),_post,_action,reward) ON CONFLICT(actor,source_id,action) DO NOTHING RETURNING id INTO inserted;
 IF inserted IS NULL THEN RETURN false; END IF;
 INSERT INTO public.wallets(user_id) VALUES(target) ON CONFLICT DO NOTHING;
 UPDATE public.wallets SET coins=coins+reward WHERE user_id=target;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_forge_action(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_forge_action(uuid,text) TO authenticated;
CREATE FUNCTION public.reward_post_reaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid; inserted uuid;
BEGIN
 SELECT user_id INTO target FROM public.hub_posts WHERE id=new.post_id;
 IF target IS NULL OR target=new.user_id THEN RETURN new; END IF;
 INSERT INTO public.coin_events(recipient,actor,source_id,action,amount) VALUES(target,new.user_id,new.post_id,'reaction',1) ON CONFLICT(actor,source_id,action) DO NOTHING RETURNING id INTO inserted;
 IF inserted IS NOT NULL THEN
  INSERT INTO public.wallets(user_id) VALUES(target) ON CONFLICT DO NOTHING;
  UPDATE public.wallets SET coins=coins+1 WHERE user_id=target;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER post_reaction_reward AFTER INSERT ON public.post_reactions FOR EACH ROW EXECUTE FUNCTION public.reward_post_reaction();
DROP POLICY "add own post reaction" ON public.post_reactions;
CREATE POLICY "add own post reaction" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.hub_posts WHERE id=post_id));
DROP POLICY "post media read" ON storage.objects;
CREATE POLICY "post media read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='post-media' AND (owner_id=auth.uid()::text OR EXISTS(SELECT 1 FROM public.hub_posts WHERE media_path=name)));
CREATE POLICY "remove own post media" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='post-media' AND owner_id=auth.uid()::text);
CREATE POLICY "forge file upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='forge-files' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "forge file read" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='forge-files' AND (owner_id=auth.uid()::text OR EXISTS(SELECT 1 FROM public.forge_posts WHERE file_path=name)));
CREATE POLICY "forge file cleanup" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='forge-files' AND owner_id=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.forge_posts WHERE file_path=name));
CREATE FUNCTION public.forge_file_check() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF new.file_path IS NOT NULL AND (auth.uid() IS NULL OR split_part(new.file_path,'/',1)<>auth.uid()::text) THEN RAISE EXCEPTION 'Invalid file'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER forge_posts_file_check BEFORE INSERT ON public.forge_posts FOR EACH ROW EXECUTE FUNCTION public.forge_file_check();