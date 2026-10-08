CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid NOT NULL,
  addressee uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester <> addressee)
);
CREATE UNIQUE INDEX friendships_pair ON public.friendships (least(requester, addressee), greatest(requester, addressee));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own friendships" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester, addressee));
CREATE POLICY "send requests" ON public.friendships FOR INSERT TO authenticated WITH CHECK (requester = auth.uid() AND status = 'pending');
CREATE POLICY "accept requests" ON public.friendships FOR UPDATE TO authenticated USING (addressee = auth.uid()) WITH CHECK (addressee = auth.uid() AND status = 'accepted');
CREATE POLICY "remove friendships" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() IN (requester, addressee));

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.friendships WHERE status = 'accepted'
    AND ((requester = _a AND addressee = _b) OR (requester = _b AND addressee = _a)))
$$;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender uuid NOT NULL,
  recipient uuid,
  sender_name text NOT NULL DEFAULT '',
  sender_is_owner boolean NOT NULL DEFAULT false,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','party')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_recent ON public.messages (created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read world or own dms" ON public.messages FOR SELECT TO authenticated
  USING (recipient IS NULL OR auth.uid() IN (sender, recipient));
CREATE POLICY "send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender = auth.uid() AND (recipient IS NULL OR public.are_friends(auth.uid(), recipient)));
CREATE POLICY "delete own or owner" ON public.messages FOR DELETE TO authenticated
  USING (sender = auth.uid() OR public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.messages_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.sender := auth.uid();
  SELECT username INTO NEW.sender_name FROM public.profiles WHERE user_id = NEW.sender;
  NEW.sender_name := coalesce(NEW.sender_name, 'player');
  NEW.sender_is_owner := public.has_role(NEW.sender, 'owner');
  NEW.body := public.clean_text(NEW.body);
  RETURN NEW;
END $$;
CREATE TRIGGER messages_before_insert BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.messages_before_insert();

CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('gg','fire','diamond','creeper','heart','lol')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT ALL ON public.reactions TO service_role;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see reactions on visible messages" ON public.reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id));
CREATE POLICY "add own reactions" ON public.reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id));
CREATE POLICY "remove own reactions" ON public.reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages, public.friendships, public.reactions;