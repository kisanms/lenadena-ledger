CREATE TABLE public.push_subs (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subs TO authenticated;
GRANT ALL ON public.push_subs TO service_role;
ALTER TABLE public.push_subs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subs" ON public.push_subs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.push_targets(_party uuid)
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.endpoint FROM parties p JOIN push_subs s
    ON s.user_id = CASE WHEN p.user_id = auth.uid() THEN p.counterparty_id ELSE p.user_id END
  WHERE p.id = _party AND auth.uid() IS NOT NULL
    AND (p.user_id = auth.uid() OR p.counterparty_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.push_targets(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_targets(uuid) TO authenticated;