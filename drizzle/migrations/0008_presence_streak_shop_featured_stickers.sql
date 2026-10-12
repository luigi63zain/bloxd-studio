CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  coins int NOT NULL DEFAULT 0,
  streak int NOT NULL DEFAULT 0,
  streak_day date,
  last_seen timestamptz,
  name_color text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.wallets TO anon, authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets are public" ON public.wallets FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.wallets (user_id) SELECT user_id FROM public.profiles ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.profile_make_wallet() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin insert into public.wallets (user_id) values (new.user_id) on conflict do nothing; return new; end $$;
CREATE TRIGGER profiles_make_wallet AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profile_make_wallet();

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item)
);
GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.shop_price(_item text) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE _item
    WHEN 'color:coral' THEN 50 WHEN 'color:mint' THEN 50 WHEN 'color:sky' THEN 75
    WHEN 'color:grape' THEN 100 WHEN 'color:amber' THEN 150 WHEN 'color:rainbow' THEN 300
    WHEN 'badge:fire' THEN 100 WHEN 'badge:diamond' THEN 200 WHEN 'badge:creeper' THEN 250 WHEN 'badge:crown' THEN 400
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.buy_item(_item text) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare uid uuid := auth.uid(); price int := public.shop_price(_item); left_coins int;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  if price is null then raise exception 'Unknown item'; end if;
  if exists (select 1 from public.purchases where user_id = uid and item = _item) then raise exception 'You already own this'; end if;
  update public.wallets set coins = coins - price where user_id = uid and coins >= price returning coins into left_coins;
  if not found then raise exception 'Not enough ULTRACOINS'; end if;
  insert into public.purchases (user_id, item) values (uid, _item);
  return left_coins;
end $$;

CREATE OR REPLACE FUNCTION public.equip_item(_kind text, _item text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first'; end if;
  if _kind not in ('color','badge') then raise exception 'Bad kind'; end if;
  if _item <> '' and not exists (select 1 from public.purchases where user_id = uid and item = _kind || ':' || _item) then
    raise exception 'You do not own this';
  end if;
  if _kind = 'color' then update public.wallets set name_color = _item where user_id = uid;
  else update public.wallets set badge = _item where user_id = uid; end if;
end $$;

CREATE OR REPLACE FUNCTION public.heartbeat() RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare uid uuid := auth.uid(); w public.wallets; today date := (now() at time zone 'utc')::date;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select * into w from public.wallets where user_id = uid for update;
  if w.streak_day is distinct from today then
    if w.streak_day = today - 1 then w.streak := w.streak + 1; else w.streak := 1; end if;
    w.streak_day := today;
    w.coins := w.coins + 2 + least(w.streak, 10);
  end if;
  update public.wallets set last_seen = now(), streak = w.streak, streak_day = w.streak_day, coins = w.coins
    where user_id = uid returning * into w;
  return w;
end $$;

CREATE OR REPLACE FUNCTION public.hub_award_coins() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if (select count(*) from public.hub_posts where user_id = new.user_id and created_at > date_trunc('day', now())) <= 20 then
    insert into public.wallets (user_id) values (new.user_id) on conflict do nothing;
    update public.wallets set coins = coins + 5 where user_id = new.user_id;
  end if;
  return new;
end $$;
CREATE TRIGGER hub_posts_award AFTER INSERT ON public.hub_posts FOR EACH ROW EXECUTE FUNCTION public.hub_award_coins();

REVOKE EXECUTE ON FUNCTION public.buy_item(text), public.equip_item(text, text), public.heartbeat() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.buy_item(text), public.equip_item(text, text), public.heartbeat() TO authenticated;

ALTER TABLE public.hub_posts ADD COLUMN sticker jsonb;
ALTER TABLE public.hub_posts ADD CONSTRAINT hub_posts_sticker_size CHECK (sticker IS NULL OR pg_column_size(sticker) < 20000);

CREATE TABLE public.featured_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  image_url text NOT NULL DEFAULT '' CHECK (image_url = '' OR image_url LIKE 'https://%'),
  link text NOT NULL CHECK (link LIKE 'https://bloxd.io%'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.featured_games TO anon, authenticated;
GRANT INSERT, DELETE ON public.featured_games TO authenticated;
GRANT ALL ON public.featured_games TO service_role;
ALTER TABLE public.featured_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone sees featured games" ON public.featured_games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owners add featured games" ON public.featured_games FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "owners remove featured games" ON public.featured_games FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  pixels jsonb NOT NULL CHECK (pg_column_size(pixels) < 20000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.stickers TO authenticated;
GRANT ALL ON public.stickers TO service_role;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own stickers" ON public.stickers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "make own stickers" ON public.stickers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own stickers" ON public.stickers FOR DELETE TO authenticated USING (auth.uid() = user_id);