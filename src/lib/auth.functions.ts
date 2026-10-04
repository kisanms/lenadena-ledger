import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

// ---------- Recovery PIN (stored hashed in server-only app_metadata) ----------
const MAX_TRIES = 5;
const LOCK_MS = 30 * 60 * 1000;

async function hashPin(pin: string, salt: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

/** Set or change the signed-in user's recovery PIN. */
export const setRecoveryPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pin: pinSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const salt = crypto.randomUUID();
    const hash = await hashPin(data.pin, salt);
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = { ...(u.user?.app_metadata ?? {}), rpin: { salt, hash }, rpin_fail: 0, rpin_lock: 0 };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { app_metadata: meta });
    if (error) return { ok: false as const, error: "Could not save recovery PIN" };
    return { ok: true as const };
  });

/** Whether the signed-in user has a recovery PIN. */
export const hasRecoveryPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return { set: !!(u.user?.app_metadata as any)?.rpin };
  });

/** Reset password using mobile/email + recovery PIN. Locks for 30 min after 5 wrong tries. */
export const resetWithRecoveryPin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ id: z.string().min(3).max(200), pin: pinSchema, password: z.string().min(6).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fail = { ok: false as const, error: "Wrong mobile/email or recovery PIN" };
    const v = data.id.trim().toLowerCase();
    const q = supabaseAdmin.from("profiles").select("id, email");
    const { data: prof } = await (v.includes("@") ? q.eq("email", v) : q.eq("phone_norm", normPhone(v))).maybeSingle();
    if (!prof) return fail;
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(prof.id);
    const meta = (u.user?.app_metadata ?? {}) as Record<string, any>;
    if (!meta["rpin"]) return { ok: false as const, error: "No recovery PIN set for this account" };
    if ((meta["rpin_lock"] ?? 0) > Date.now()) return { ok: false as const, error: "Too many wrong tries. Try again in 30 minutes." };
    const ok = (await hashPin(data.pin, meta["rpin"].salt)) === meta["rpin"].hash;
    if (!ok) {
      const fails = (meta["rpin_fail"] ?? 0) + 1;
      const locked = fails >= MAX_TRIES;
      await supabaseAdmin.auth.admin.updateUserById(prof.id, {
        app_metadata: { ...meta, rpin_fail: locked ? 0 : fails, rpin_lock: locked ? Date.now() + LOCK_MS : 0 },
      });
      return locked ? { ok: false as const, error: "Too many wrong tries. Try again in 30 minutes." } : fail;
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(prof.id, {
      password: data.password,
      app_metadata: { ...meta, rpin_fail: 0, rpin_lock: 0 },
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, email: prof.email as string };
  });
