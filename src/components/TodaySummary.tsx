import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useI18n } from "@/lib/i18n";
import { inr, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = { id: string; party_id: string; amount: number; direction: "gave" | "got"; entry_date: string; note: string | null; name: string };

function useToday() {
  return useQuery({
    queryKey: ["entries", "today"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const { data, error } = await supabase
        .from("entries")
        .select("id, party_id, amount, direction, entry_date, note, user_id, parties(name)")
        .gte("entry_date", start.toISOString())
        .lt("entry_date", end.toISOString())
        .order("entry_date", { ascending: false });
      if (error) throw error;
      const me = (await supabase.auth.getSession()).data.session?.user.id;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        party_id: e.party_id,
        amount: Number(e.amount),
        direction: e.user_id !== me ? (e.direction === "gave" ? "got" : "gave") : e.direction,
        entry_date: e.entry_date,
        note: e.note,
        name: e.parties?.name ?? "—",
      })) as Row[];
    },
  });
}

export function TodaySummary() {
  const { t } = useI18n();
  const { data = [] } = useToday();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(false);
  const given = data.filter((e) => e.direction === "gave").reduce((s, e) => s + e.amount, 0);
  const got = data.filter((e) => e.direction === "got").reduce((s, e) => s + e.amount, 0);
  const net = got - given;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="w-full flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <CalendarCheck className="h-4 w-4 text-primary" /> {t("aaj_ka_hisaab")}
        </span>
        <span className="flex items-center gap-2 text-sm">
          {!open && <span className={cn("font-bold", net >= 0 ? "text-gain" : "text-loss")}>{net >= 0 ? "+" : "−"}{inr(net)}</span>}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t("collapse_summary", "Hide today's summary") : t("expand_summary", "Show today's summary")}
            className="grid place-items-center h-9 w-9 rounded-full active:bg-secondary"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </span>
      </div>
      {open && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">{t("today_credit_given")}</p>
              <p className="text-lg font-bold text-loss">{inr(given)}</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">{t("today_recovery")}</p>
              <p className="text-lg font-bold text-gain">{inr(got)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-secondary p-3">
            <p className="text-sm">{t("today_net")}</p>
            <p className={cn("text-lg font-bold", net >= 0 ? "text-gain" : "text-loss")}>{net >= 0 ? "+" : "−"}{inr(net)}</p>
          </div>
          <button className="mt-3 w-full text-sm font-semibold text-primary disabled:text-muted-foreground" disabled={!data.length} onClick={() => setList(true)}>
            {data.length ? t("view_today_entries").replace("{n}", String(data.length)) : t("no_entries_today")}
          </button>
        </div>
      )}
      <Drawer open={list} onOpenChange={setList}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{t("today_entries_title")}</DrawerTitle></DrawerHeader>
          <ul className="max-h-[60dvh] overflow-y-auto px-4 pb-6 divide-y">
            {data.map((e) => (
              <li key={e.id}>
                <Link to="/party/$id" params={{ id: e.party_id }} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{fmtTime(e.entry_date)}{e.note ? ` · ${e.note}` : ""}</p>
                  </div>
                  <span className={cn("font-bold", e.direction === "got" ? "text-gain" : "text-loss")}>
                    {e.direction === "got" ? "+" : "−"}{inr(e.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
