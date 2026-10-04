import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const normPhone = (p: string) => {
  let d = p.replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) d = "91" + d;
  return d;
};

/** Sign in with mobile number + password: resolves the account email server-side (never exposed). */
export const signInWithPhone = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().min(6).max(20), password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");
    const fail = { ok: false as const, error: "Wrong mobile number or password" };
    const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("phone_norm", normPhone(data.phone)).maybeSingle();
    if (!prof?.email) return fail;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const anon = createClient(process.env["SUPABASE_URL"]!, key, {
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: s, error } = await anon.auth.signInWithPassword({ email: prof.email, password: data.password });
    if (error || !s.session) return fail;
    return { ok: true as const, access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });

/** Checks whether a mobile number is already registered. */
export const phoneTaken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().min(6).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("phone_norm", normPhone(data.phone)).maybeSingle();
    return { taken: !!prof };
  });
