CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  username_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower ON public.profiles (lower(username));
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.forge_posts ADD COLUMN user_id uuid;
ALTER TABLE public.forge_posts ADD COLUMN author_is_owner boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.profile_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  if new.username is distinct from old.username then
    new.username := btrim(new.username);
    if new.username !~ '^[A-Za-z0-9_]{3,20}$' then
      raise exception 'Username must be 3-20 letters, numbers or _';
    end if;
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '15 days' then
      raise exception 'You can change your username again on %', to_char(old.username_changed_at + interval '15 days', 'Mon DD, YYYY');
    end if;
    new.username_changed_at := now();
  else
    new.username_changed_at := old.username_changed_at;
  end if;
  return new;
end $$;
CREATE TRIGGER profiles_before_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profile_before_update();

CREATE OR REPLACE FUNCTION public.profile_after_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.username is distinct from old.username then
    update public.forge_posts set author = new.username where user_id = new.user_id;
  end if;
  return new;
end $$;
CREATE TRIGGER profiles_after_update AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profile_after_update();

CREATE OR REPLACE FUNCTION public.make_username(_email text, _uid uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare base text; cand text; n int := 0;
begin
  base := left(regexp_replace(split_part(coalesce(_email,''), '@', 1), '[^A-Za-z0-9_]', '', 'g'), 16);
  if length(base) < 3 then base := 'builder'; end if;
  cand := base;
  while exists (select 1 from public.profiles where lower(username) = lower(cand)) loop
    n := n + 1; cand := base || n::text;
  end loop;
  return cand;
end $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'luigi64zain@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
    insert into public.profiles (user_id, username) values (new.id, 'luigi64zain') on conflict do nothing;
  else
    insert into public.profiles (user_id, username) values (new.id, public.make_username(new.email, new.id)) on conflict do nothing;
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.forge_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare p public.profiles;
begin
  new.user_id := auth.uid();
  new.author_is_owner := false;
  if new.user_id is not null then
    select * into p from public.profiles where user_id = new.user_id;
    if found then new.author := p.username; end if;
    new.author_is_owner := public.has_role(new.user_id, 'owner');
  elsif exists (select 1 from public.profiles where lower(username) = lower(btrim(new.author))) then
    raise exception 'That username belongs to an account. Sign in to use it.';
  end if;
  return new;
end $$;
CREATE TRIGGER forge_posts_before_insert BEFORE INSERT ON public.forge_posts FOR EACH ROW EXECUTE FUNCTION public.forge_before_insert();

INSERT INTO public.profiles (user_id, username)
SELECT u.id, 'luigi64zain' FROM auth.users u WHERE lower(u.email) = 'luigi64zain@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (user_id, username)
SELECT u.id, public.make_username(u.email, u.id) FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

UPDATE public.forge_posts f SET user_id = u.id, author = 'luigi64zain', author_is_owner = true
FROM auth.users u WHERE lower(u.email) = 'luigi64zain@gmail.com' AND lower(btrim(f.author)) = 'luigi64zain';