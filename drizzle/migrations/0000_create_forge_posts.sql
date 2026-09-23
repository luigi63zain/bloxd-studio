CREATE TABLE public.forge_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  author text NOT NULL DEFAULT 'anonymous' CHECK (char_length(author) BETWEEN 1 AND 40),
  kind text NOT NULL CHECK (kind IN ('code','schematic')),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  data jsonb NOT NULL,
  code text NOT NULL DEFAULT '' CHECK (char_length(code) <= 200000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.forge_posts TO anon, authenticated;
GRANT ALL ON public.forge_posts TO service_role;
ALTER TABLE public.forge_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view forge posts" ON public.forge_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can share to the forge" ON public.forge_posts FOR INSERT TO anon, authenticated WITH CHECK (pg_column_size(data) < 500000);