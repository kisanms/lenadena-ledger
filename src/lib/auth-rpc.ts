import { supabase } from "@/integrations/supabase/client";

const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args);

export const SECURITY_QUESTIONS = [
  "What is your favorite animal?",
  "What was the name of your favorite school teacher?",
  "What is your father's middle name?",
  "What was the name of your first school?",
  "What is your favorite food or dish?",
  "What is the name of your hometown / village?",
] as const;

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

export async function getSecurityQuestion(id: string) {
  const { data, error } = await rpc("get_security_question", { _id: id });
  if (error) return null;
  return data as string | null;
}

export async function setSecurityQuestion(question: string, answer: string) {
  const cleanAns = answer.trim().toLowerCase();
  const { error } = await rpc("set_security_question", { 
    _question: question, 
    _answer: cleanAns 
  });
  return error ? { ok: false as const, error: error.message || "Could not save security question" } : { ok: true as const };
}

export async function hasSecurityQuestion() {
  const { data, error } = await rpc("has_security_question");
  if (error || !data) return { has: false, question: null };
  return data as { has: boolean; question: string | null };
}

export async function resetWithSecurityAnswer(id: string, answer: string, password: string) {
  const cleanAns = answer.trim().toLowerCase();
  const { data, error } = await rpc("reset_password_with_answer", { 
    _id: id, 
    _answer: cleanAns, 
    _password: password 
  });
  if (error) return { ok: false as const, error: "Could not reset password" };
  return data as { ok: true; email: string } | { ok: false; error: string };
}
