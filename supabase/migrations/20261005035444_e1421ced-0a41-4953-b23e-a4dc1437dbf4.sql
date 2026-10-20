CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.recovery_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  fails int NOT NULL DEFAULT 0,
  locked_until timestamptz
);
GRANT ALL ON public.recovery_pins TO service_role;
ALTER TABLE public.recovery_pins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.phone_taken(_phone text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE phone_norm = public.norm_phone(_phone));
$$;

CREATE OR REPLACE FUNCTION public.login_email_for_phone(_phone text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM profiles WHERE phone_norm = public.norm_phone(_phone) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.set_recovery_pin(_pin text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _pin !~ '^\d{4}$' THEN RAISE EXCEPTION 'PIN must be 4 digits'; END IF;
  INSERT INTO recovery_pins(user_id, pin_hash) VALUES (auth.uid(), crypt(_pin, gen_salt('bf', 10)))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, fails = 0, locked_until = NULL;
END $$;

CREATE OR REPLACE FUNCTION public.has_recovery_pin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM recovery_pins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.reset_password_with_pin(_id text, _pin text, _password text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v text := lower(trim(_id)); p record; r record;
BEGIN
  IF _pin !~ '^\d{4}$' OR length(_password) < 6 THEN RETURN json_build_object('ok', false, 'error', 'Invalid input'); END IF;
  IF position('@' in v) > 0 THEN SELECT id, email INTO p FROM profiles WHERE lower(email) = v LIMIT 1;
  ELSE SELECT id, email INTO p FROM profiles WHERE phone_norm = public.norm_phone(v) LIMIT 1; END IF;
  IF p.id IS NULL THEN RETURN json_build_object('ok', false, 'error', 'Wrong mobile/email or recovery PIN'); END IF;
  SELECT * INTO r FROM recovery_pins WHERE user_id = p.id FOR UPDATE;
  IF r.user_id IS NULL THEN RETURN json_build_object('ok', false, 'error', 'No recovery PIN set for this account'); END IF;
  IF r.locked_until IS NOT NULL AND r.locked_until > now() THEN
    RETURN json_build_object('ok', false, 'error', 'Too many wrong tries. Try again in 30 minutes.'); END IF;
  IF crypt(_pin, r.pin_hash) <> r.pin_hash THEN
    IF r.fails + 1 >= 5 THEN
      UPDATE recovery_pins SET fails = 0, locked_until = now() + interval '30 minutes' WHERE user_id = p.id;
      RETURN json_build_object('ok', false, 'error', 'Too many wrong tries. Try again in 30 minutes.');
    END IF;
    UPDATE recovery_pins SET fails = r.fails + 1 WHERE user_id = p.id;
    RETURN json_build_object('ok', false, 'error', 'Wrong mobile/email or recovery PIN');
  END IF;
  UPDATE auth.users SET encrypted_password = crypt(_password, gen_salt('bf', 10)), updated_at = now() WHERE id = p.id;
  UPDATE recovery_pins SET fails = 0, locked_until = NULL WHERE user_id = p.id;
  RETURN json_build_object('ok', true, 'email', p.email);
END $$;

REVOKE ALL ON FUNCTION public.phone_taken(text), public.login_email_for_phone(text), public.reset_password_with_pin(text,text,text), public.set_recovery_pin(text), public.has_recovery_pin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_taken(text), public.login_email_for_phone(text), public.reset_password_with_pin(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_recovery_pin(text), public.has_recovery_pin() TO authenticated;