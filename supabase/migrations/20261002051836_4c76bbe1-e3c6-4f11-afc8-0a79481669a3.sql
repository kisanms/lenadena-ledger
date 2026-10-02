CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  business_name TEXT,
  owner_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  kind TEXT NOT NULL DEFAULT 'customer' CHECK (kind IN ('customer','supplier')),
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parties_user_idx ON public.parties(user_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own parties" ON public.parties FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('gave','got')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX entries_party_idx ON public.entries(party_id, entry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO authenticated;
GRANT ALL ON public.entries TO service_role;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entries" ON public.entries FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.parties p WHERE p.id = party_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.recalc_party_balance() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid UUID;
BEGIN
  pid := COALESCE(NEW.party_id, OLD.party_id);
  UPDATE public.parties SET
    balance = COALESCE((SELECT SUM(CASE WHEN direction='gave' THEN amount ELSE -amount END) FROM public.entries WHERE party_id = pid), 0),
    last_activity = now()
  WHERE id = pid;
  IF TG_OP = 'UPDATE' AND OLD.party_id <> NEW.party_id THEN
    UPDATE public.parties SET balance = COALESCE((SELECT SUM(CASE WHEN direction='gave' THEN amount ELSE -amount END) FROM public.entries WHERE party_id = OLD.party_id), 0) WHERE id = OLD.party_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER entries_balance AFTER INSERT OR UPDATE OR DELETE ON public.entries FOR EACH ROW EXECUTE FUNCTION public.recalc_party_balance();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, owner_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;