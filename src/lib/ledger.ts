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
