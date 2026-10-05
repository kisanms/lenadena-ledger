// Auth helpers that run fully in the browser via secure database functions
// (works on any host — no server admin key needed).
import { supabase } from "@/integrations/supabase/client";

const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args);

export async function phoneTaken(phone: string) {
  const { data, error } = await rpc("phone_taken", { _phone: phone });
  if (error) throw error;
  return !!data;
}

export async function signInWithPhone(phone: string, password: string) {
  const { data: email } = await rpc("login_email_for_phone", { _phone: phone });
  if (!email) return { ok: false as const, error: "Wrong mobile number or password" };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false as const, error: "Wrong mobile number or password" } : { ok: true as const };
}

export async function setRecoveryPin(pin: string) {
  const { error } = await rpc("set_recovery_pin", { _pin: pin });
  return error ? { ok: false as const, error: "Could not save recovery PIN" } : { ok: true as const };
}

export async function hasRecoveryPin() {
  const { data, error } = await rpc("has_recovery_pin");
  if (error) throw error;
  return !!data;
}

export async function resetWithRecoveryPin(id: string, pin: string, password: string) {
  const { data, error } = await rpc("reset_password_with_pin", { _id: id, _pin: pin, _password: password });
  if (error) return { ok: false as const, error: "Could not reset password" };
  return data as { ok: true; email: string } | { ok: false; error: string };
}
