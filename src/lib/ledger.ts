import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PartyKind = "customer" | "supplier";
export type Party = {
  id: string;
  kind: PartyKind;
  name: string;
  phone: string | null;
  note: string | null;
  balance: number;
  last_activity: string;
};
export type Entry = {
  id: string;
  party_id: string;
  direction: "gave" | "got";
  amount: number;
  note: string | null;
  entry_date: string;
};

export function useParties() {
  return useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .order("last_activity", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, balance: Number(p.balance) })) as Party[];
    },
  });
}

export function useParty(id: string) {
  return useQuery({
    queryKey: ["party", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("parties").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? ({ ...data, balance: Number(data.balance) } as Party) : null;
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
      return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as Entry[];
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

export const labels = (kind: PartyKind) =>
  kind === "customer"
    ? { gave: "You Gave", gaveHint: "Credit / goods given", got: "You Got", gotHint: "Payment received" }
    : { gave: "You Paid", gaveHint: "Payment / advance to supplier", got: "You Got", gotHint: "Goods / credit purchase" };

export function balanceText(b: number) {
  if (b > 0) return "You'll get";
  if (b < 0) return "You'll give";
  return "Settled";
}

export function receiptMessage(opts: {
  business?: string | null | undefined;
  party: Party;
  entry?: { direction: "gave" | "got"; amount: number; note?: string | null; entry_date: string };
  balance: number;
}) {
  const { business, party, entry, balance } = opts;
  const r = (n: number) => "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const lines = [`*${business || "LenaDena"}* 🧾`, `Namaste ${party.name},`, ""];
  if (entry) {
    const d = new Date(entry.entry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const what =
      entry.direction === "got"
        ? party.kind === "customer" ? "Payment received" : "Goods/credit received"
        : party.kind === "customer" ? "Credit given" : "Payment made";
    lines.push(`${what}: *${r(entry.amount)}* on ${d}`);
    if (entry.note) lines.push(`Note: ${entry.note}`);
    lines.push("");
  }
  if (balance > 0) lines.push(`Balance due from you: *${r(balance)}*`);
  else if (balance < 0) lines.push(`Balance payable to you: *${r(balance)}*`);
  else lines.push("Your account is fully settled ✅");
  lines.push("", "_Sent via LenaDena digital khata_");
  return lines.join("\n");
}
