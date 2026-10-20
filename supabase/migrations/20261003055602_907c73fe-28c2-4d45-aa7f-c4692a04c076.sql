CREATE OR REPLACE FUNCTION public.norm_phone(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p IS NULL THEN NULL ELSE
    (WITH d AS (SELECT ltrim(regexp_replace(p, '\D', '', 'g'), '0') AS v)
     SELECT CASE WHEN v = '' THEN NULL WHEN length(v) = 10 THEN '91' || v ELSE v END FROM d) END
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text, ADD COLUMN IF NOT EXISTS phone_norm text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_norm_key ON public.profiles(phone_norm) WHERE phone_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(lower(email));

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS counterparty_id uuid,
  ADD COLUMN IF NOT EXISTS owner_label text;
CREATE INDEX IF NOT EXISTS parties_counterparty_idx ON public.parties(counterparty_id);

CREATE OR REPLACE FUNCTION public.profiles_norm() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.phone_norm := public.norm_phone(NEW.phone);
  NEW.email := lower(nullif(trim(NEW.email), ''));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_norm_trg ON public.profiles;
CREATE TRIGGER profiles_norm_trg BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_norm();

CREATE OR REPLACE FUNCTION public.parties_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pn text := public.norm_phone(NEW.phone);
BEGIN
  NEW.email := lower(nullif(trim(NEW.email), ''));
  SELECT id INTO NEW.counterparty_id FROM public.profiles
   WHERE id <> NEW.user_id AND ((pn IS NOT NULL AND phone_norm = pn) OR (NEW.email IS NOT NULL AND email = NEW.email))
   LIMIT 1;
  SELECT coalesce(nullif(business_name,''), nullif(owner_name,''), email) INTO NEW.owner_label
   FROM public.profiles WHERE id = NEW.user_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS parties_link_trg ON public.parties;
CREATE TRIGGER parties_link_trg BEFORE INSERT OR UPDATE OF phone, email ON public.parties FOR EACH ROW EXECUTE FUNCTION public.parties_link();

CREATE OR REPLACE FUNCTION public.profiles_relink() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.parties SET counterparty_id = NEW.id
   WHERE user_id <> NEW.id AND counterparty_id IS NULL
     AND ((NEW.phone_norm IS NOT NULL AND public.norm_phone(phone) = NEW.phone_norm) OR (NEW.email IS NOT NULL AND email = NEW.email));
  UPDATE public.parties SET owner_label = coalesce(nullif(NEW.business_name,''), nullif(NEW.owner_name,''), NEW.email)
   WHERE user_id = NEW.id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_relink_trg ON public.profiles;
CREATE TRIGGER profiles_relink_trg AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_relink();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, owner_name, business_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'owner_name', NEW.raw_user_meta_data->>'business_name')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, phone = coalesce(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END $$;

UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

DROP POLICY IF EXISTS "counterparty parties read" ON public.parties;
CREATE POLICY "counterparty parties read" ON public.parties FOR SELECT TO authenticated USING (auth.uid() = counterparty_id);
DROP POLICY IF EXISTS "counterparty entries read" ON public.entries;
CREATE POLICY "counterparty entries read" ON public.entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parties p WHERE p.id = party_id AND p.counterparty_id = auth.uid()));