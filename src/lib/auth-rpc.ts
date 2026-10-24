import { supabase } from "@/integrations/supabase/client";
import type { LangCode } from "./i18n";

const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args);

export interface SecurityQuestionDef {
  id: string;
  labels: Record<LangCode, string>;
}

export const SECURITY_QUESTION_LIST: SecurityQuestionDef[] = [
  {
    id: "fav_animal",
    labels: {
      en: "What is your favorite animal?",
      hi: "आपका पसंदीदा जानवर कौन सा है?",
      hinglish: "Aapka favorite animal kaun sa hai?",
      gu: "તમારું મનપસંદ પ્રાણી કયું છે?",
      mr: "तुमचा आवडता प्राणी कोणता आहे?",
    },
  },
  {
    id: "fav_teacher",
    labels: {
      en: "What was the name of your favorite school teacher?",
      hi: "आपके पसंदीदा स्कूल शिक्षक का नाम क्या था?",
      hinglish: "Aapke favorite school teacher ka naam kya tha?",
      gu: "તમારા મનપસંદ શાળા શિક્ષકનું નામ શું હતું?",
      mr: "तुमच्या आवडत्या शाळेतील शिक्षकांचे नाव काय होते?",
    },
  },
  {
    id: "father_mid_name",
    labels: {
      en: "What is your father's middle name?",
      hi: "आपके पिता का मध्य नाम (Middle Name) क्या है?",
      hinglish: "Aapke pitaji ka middle name kya hai?",
      gu: "તમારા પિતાનું મધ્યમ નામ (Middle Name) શું છે?",
      mr: "तुमच्या वडिलांचे मधले नाव काय आहे?",
    },
  },
  {
    id: "first_school",
    labels: {
      en: "What was the name of your first school?",
      hi: "आपके पहले स्कूल का नाम क्या था?",
      hinglish: "Aapke pehle school ka naam kya tha?",
      gu: "તમારી પ્રથમ શાળાનું નામ શું હતું?",
      mr: "तुमच्या पहिल्या शाळेचे नाव काय होते?",
    },
  },
  {
    id: "fav_food",
    labels: {
      en: "What is your favorite food or dish?",
      hi: "आपका पसंदीदा खाना या व्यंजन कौन सा है?",
      hinglish: "Aapka favorite khana ya dish kaun si hai?",
      gu: "તમારું મનપસંદ ભોજન કે વાનગી કઈ છે?",
      mr: "तुमचा आवडता खाद्यपदार्थ कोणता आहे?",
    },
  },
  {
    id: "hometown",
    labels: {
      en: "What is the name of your hometown / village?",
      hi: "आपके गृहनगर / गाँव का नाम क्या है?",
      hinglish: "Aapke hometown / gaon ka naam kya hai?",
      gu: "તમારા વતન / ગામનું નામ શું છે?",
      mr: "तुमच्या मूळ गावाचे / शहराचे नाव काय आहे?",
    },
  },
];

export const SECURITY_QUESTIONS = SECURITY_QUESTION_LIST.map((q) => q.labels.en);

/**
 * Translates a question key or legacy question text to the current language
 */
export function getLocalizedQuestion(keyOrText: string | null | undefined, lang: LangCode = "en"): string {
  if (!keyOrText) return "";
  const match = SECURITY_QUESTION_LIST.find(
    (q) => q.id === keyOrText || q.labels.en.toLowerCase() === keyOrText.toLowerCase()
  );
  if (!match) return keyOrText;
  return match.labels[lang] || match.labels.en;
}

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
