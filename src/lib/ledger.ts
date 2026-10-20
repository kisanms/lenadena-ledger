import type { LangCode } from "./i18n";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildWebPayUrl, isValidUpiId } from "@/lib/upi";

export type PartyKind = "customer" | "supplier";
export type Party = {
  id: string;
  kind: PartyKind;
  name: string;
  phone: string | null;
  note: string | null;
  balance: number;
  last_activity: string;
  email?: string | null;
  user_id?: string;
  /** True when another user created this ledger and shared it with me (read-only, mirrored). */
  shared?: boolean;
};
export type Entry = {
  id: string;
  party_id: string;
  direction: "gave" | "got";
  amount: number;
  note: string | null;
  entry_date: string;
};

async function myId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id;
}

type PartyRow = Omit<Party, "balance" | "kind"> & { balance: number | string; kind: string; owner_label?: string | null };
/** Mirrors a ledger shared by the other side: flips balance and kind, shows the owner's name. */
function view(p: PartyRow, me?: string): Party {
  const shared = !!me && p.user_id !== me;
  const b = Number(p.balance);
  return {
    ...p,
    shared,
    balance: shared ? -b : b,
    kind: (shared ? (p.kind === "customer" ? "supplier" : "customer") : p.kind) as PartyKind,
    name: shared ? p.owner_label || p.name : p.name,
  };
}

export function useParties() {
  return useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .order("last_activity", { ascending: false });
      if (error) throw error;
      const me = await myId();
      return (data ?? []).map((p) => view(p as PartyRow, me));
    },
  });
}

export function useParty(id: string) {
  return useQuery({
    queryKey: ["party", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("parties").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? view(data as PartyRow, await myId()) : null;
    },
  });
}

export function useEntries(partyId: string) {
  return useQuery({
    queryKey: ["entries", partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq("party_id", partyId)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      const me = await myId();
      return (data ?? []).map((e) => ({
        ...e,
        amount: Number(e.amount),
        direction: e.user_id !== me ? (e.direction === "gave" ? "got" : "gave") : e.direction,
      })) as Entry[];
    },
  });
}

export function useProfile(uid?: string) {
  return useQuery({
    enabled: !!uid,
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle();
      return data;
    },
  });
}

/** Live multi-device sync: refresh cached data on any change. */
export function useLedgerRealtime(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel("ledger-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "parties" }, () => {
        qc.invalidateQueries({ queryKey: ["parties"] });
        qc.invalidateQueries({ queryKey: ["party"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "entries" }, () => {
        qc.invalidateQueries({ queryKey: ["entries"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [enabled, qc]);
}

function getActiveLang(): LangCode {
  if (typeof window === "undefined") return "en";
  try {
    const s = localStorage.getItem("lenadena_lang");
    if (s && ["en", "hi", "hinglish", "gu", "mr"].includes(s)) return s as LangCode;
  } catch { }
  return "en";
}

export const labels = (kind: PartyKind, lang?: LangCode) => {
  const currentLang = lang || getActiveLang();
  if (kind === "customer") {
    switch (currentLang) {
      case "hi":
        return { gave: "आपने दिए", gaveHint: "उधार / सामान दिया", got: "आपको मिले", gotHint: "भुगतान प्राप्त हुआ" };
      case "hinglish":
        return { gave: "Aapne Diye", gaveHint: "Credit / samaan diya", got: "Aapko Mile", gotHint: "Payment receive hua" };
      case "gu":
        return { gave: "તમે આપ્યા", gaveHint: "ઉધાર / માલ આપ્યો", got: "તમને મળ્યા", gotHint: "ચુકવણી મળી" };
      case "mr":
        return { gave: "तुम्ही दिले", gaveHint: "उधार / माल दिला", got: "तुम्हाला मिळाले", gotHint: "पेमेंट मिळाले" };
      default:
        return { gave: "You Gave", gaveHint: "Credit / goods given", got: "You Got", gotHint: "Payment received" };
    }
  } else {
    switch (currentLang) {
      case "hi":
        return { gave: "आपने चुकाए", gaveHint: "सप्लायर को भुगतान / एडवांस", got: "आपको मिले", gotHint: "सामान / क्रेडिट खरीद" };
      case "hinglish":
        return { gave: "Aapne Pay Kiye", gaveHint: "Supplier ko payment / advance", got: "Aapko Mile", gotHint: "Samaan / credit purchase" };
      case "gu":
        return { gave: "તમે ચૂકવ્યા", gaveHint: "સપ્લાયરને ચુકવણી / એડવાન્સ", got: "તમને મળ્યા", gotHint: "માલ / ક્રેડિટ ખરીદી" };
      case "mr":
        return { gave: "तुम्ही दिले", gaveHint: "सप्लायरला पेमेंट / ॲडव्हान्स", got: "तुम्हाला मिळाले", gotHint: "माल / क्रेडिट खरेदी" };
      default:
        return { gave: "You Paid", gaveHint: "Payment / advance to supplier", got: "You Got", gotHint: "Goods / credit purchase" };
    }
  }
};

export function balanceText(b: number, lang?: LangCode) {
  const currentLang = lang || getActiveLang();
  if (b > 0) {
    switch (currentLang) {
      case "hi": return "आपको मिलेंगे";
      case "hinglish": return "Aapko milenge";
      case "gu": return "તમને મળશે";
      case "mr": return "तुम्हाला येणे आहे";
      default: return "You'll get";
    }
  }
  if (b < 0) {
    switch (currentLang) {
      case "hi": return "आपको देने हैं";
      case "hinglish": return "Aapko dene hain";
      case "gu": return "તમારે આપવાના છે";
      case "mr": return "तुम्हाला देणे आहे";
      default: return "You'll give";
    }
  }
  switch (currentLang) {
    case "hi": return "हिसाब चुकता";
    case "hinglish": return "Hisab barabar";
    case "gu": return "હિસાબ સરભર";
    case "mr": return "हिशोब पूर्ण";
    default: return "Settled";
  }
}

export function receiptMessage(opts: {
  business?: string | null | undefined;
  party: Party;
  entry?: { direction: "gave" | "got"; amount: number; note?: string | null; entry_date: string };
  balance: number;
  lang?: LangCode;
  /** Shopkeeper's UPI ID, e.g. shop@okaxis. If valid, a pay link is added when balance is due. */
  upiId?: string | null | undefined;
}) {
  const { business, party, entry, balance, upiId } = opts;
  const currentLang = opts.lang || getActiveLang();
  const r = (n: number) => "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const lines = [`*${business || "LenaDena"}* 🧾`, `Namaste ${party.name},`, ""];
  if (entry) {
    const d = new Date(entry.entry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    let what = "";
    if (entry.direction === "got") {
      if (party.kind === "customer") {
        what = currentLang === "hi" ? "भुगतान प्राप्त हुआ" : currentLang === "gu" ? "ચુકવણી મળી" : currentLang === "mr" ? "पेमेंट मिळाले" : currentLang === "hinglish" ? "Payment mila" : "Payment received";
      } else {
        what = currentLang === "hi" ? "सामान / क्रेडिट प्राप्त हुआ" : currentLang === "gu" ? "માલ મળ્યો" : currentLang === "mr" ? "माल मिळाला" : currentLang === "hinglish" ? "Goods receive hue" : "Goods/credit received";
      }
    } else {
      if (party.kind === "customer") {
        what = currentLang === "hi" ? "उधार दिया गया" : currentLang === "gu" ? "ઉધાર આપેલ" : currentLang === "mr" ? "उधार दिले" : currentLang === "hinglish" ? "Udhaar diya" : "Credit given";
      } else {
        what = currentLang === "hi" ? "भुगतान किया गया" : currentLang === "gu" ? "ચુકવણી કરી" : currentLang === "mr" ? "पेमेंट केले" : currentLang === "hinglish" ? "Payment kiya" : "Payment made";
      }
    }
    const noteWord = currentLang === "hi" || currentLang === "mr" ? "नोट" : currentLang === "gu" ? "નોંધ" : "Note";
    const onWord = currentLang === "hi" || currentLang === "mr" ? "दिनांक" : currentLang === "gu" ? "તારીખ" : "on";
    lines.push(`${what}: *${r(entry.amount)}* ${onWord} ${d}`);
    if (entry.note) lines.push(`${noteWord}: ${entry.note}`);
    lines.push("");
  }
  if (balance > 0) {
    const balDue = currentLang === "hi" ? "आपकी तरफ कुल बाकी" : currentLang === "gu" ? "તમારી તરફ બાકી રકમ" : currentLang === "mr" ? "तुमच्याकडे येणे बाकी" : currentLang === "hinglish" ? "Balance due from you" : "Balance due from you";
    lines.push(`${balDue}: *${r(balance)}*`);
  } else if (balance < 0) {
    const balPay = currentLang === "hi" ? "आपको कुल देने हैं" : currentLang === "gu" ? "તમારે આપવાના બાકી" : currentLang === "mr" ? "तुम्हाला देणे बाकी" : currentLang === "hinglish" ? "Balance payable to you" : "Balance payable to you";
    lines.push(`${balPay}: *${r(balance)}*`);
  } else {
    const fullySettled = currentLang === "hi" ? "आपका खाता पूरी तरह चुकता है ✅" : currentLang === "gu" ? "ખાતું સંપૂર્ણ સરભર થયેલ છે ✅" : currentLang === "mr" ? "खाते पूर्णपणे चुकता झाले आहे ✅" : currentLang === "hinglish" ? "Aapka account fully settled hai ✅" : "Your account is fully settled ✅";
    lines.push(fullySettled);
  }

  // Only include a payment link when money is owed to the shopkeeper and the UPI ID is valid.
  if (balance > 0 && upiId && isValidUpiId(upiId.trim())) {
    const payUrl = buildWebPayUrl({
      pa: upiId.trim(),
      pn: business || "LenaDena",
      am: balance,
      tn: `Bill payment - ${party.name}`,
    });
    const payLabel = currentLang === "hi"
      ? "💳 UPI से भुगतान करें (GPay/PhonePe/Paytm):"
      : currentLang === "gu"
        ? "💳 UPI દ્વારા ચૂકવો (GPay/PhonePe/Paytm):"
        : currentLang === "mr"
          ? "💳 UPI द्वारे भरा (GPay/PhonePe/Paytm):"
          : currentLang === "hinglish"
            ? "💳 UPI se pay karein (GPay/PhonePe/Paytm):"
            : "💳 Pay via UPI (GPay/PhonePe/Paytm):";
    lines.push("", payLabel, payUrl);
  }

  const footer = currentLang === "hi" ? "_LenaDena डिजिटल खाता द्वारा भेजा गया_" : currentLang === "gu" ? "_LenaDena ડિજિટલ ખાતાવહી દ્વારા મોકલેલ_" : currentLang === "mr" ? "_LenaDena डिजिटल खातावही द्वारे पाठवले_" : "_Sent via LenaDena digital khata_";
  lines.push("", footer);
  const dlText = currentLang === "hi" ? "📲 ऐप डाउनलोड करें:" : currentLang === "gu" ? "📲 એપ ડાઉનલોડ કરો:" : currentLang === "mr" ? "📲 ॲप डाउनलोड करा:" : "📲 Download the app:";
  lines.push("", dlText, "https://lenadena-one-stop-solution.vercel.app/apk");
  return lines.join("\n");
}