import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ArrowDownLeft, ArrowUpRight, ChevronRight, CheckCheck, BellRing } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useParties } from "@/lib/ledger";
import { useI18n } from "@/lib/i18n";
import { inr, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEEN = "ld_notif_seen";
type Filter = "all" | "got" | "paid";

function ding() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.15;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.36);
    });
  } catch {
    /* sound unavailable */
  }
}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return "Earlier";
}

/** Bank-style alerts for entries other people recorded in khatas shared with me. */
export function NotificationBell() {
  const { session } = useAuth();
  const me = session?.user.id;
  const qc = useQueryClient();
  const { t } = useI18n();
  const { data: parties } = useParties();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [lastSeen, setLastSeen] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => setSeen(Number(localStorage.getItem(SEEN) || 0)), []);

  const { data: items = [] } = useQuery({
    queryKey: ["notifs", me],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("entries")
        .select("id, party_id, direction, amount, note, created_at, user_id")
        .neq("user_id", me!)
        .order("created_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel("notif-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "entries" }, (p) => {
        if ((p.new as { user_id?: string }).user_id !== me) {
          ding();
          qc.invalidateQueries({ queryKey: ["notifs", me] });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, qc]);

  const unread = items.filter((i) => new Date(i.created_at).getTime() > seen).length;
  const name = (id: string) => parties?.find((p) => p.id === id)?.name ?? "Someone";
  // Mirrored: when they record "gave", it means I got money/credit.
  const isGot = (dir: string) => dir === "gave";

  const counts = useMemo(
    () => ({
      all: items.length,
      got: items.filter((i) => isGot(i.direction)).length,
      paid: items.filter((i) => !isGot(i.direction)).length,
    }),
    [items],
  );

  const groups = useMemo(() => {
    const list = items.filter((i) =>
      filter === "all" ? true : filter === "got" ? isGot(i.direction) : !isGot(i.direction),
    );
    const out: { label: string; rows: typeof list }[] = [];
    for (const i of list) {
      const label = dayLabel(i.created_at);
      const g = out.find((x) => x.label === label);
      if (g) g.rows.push(i);
      else out.push({ label, rows: [i] });
    }
    return out;
  }, [items, filter]);

  const markRead = () => {
    const now = Date.now();
    localStorage.setItem(SEEN, String(now));
    setSeen(now);
  };

  const openSheet = () => {
    setLastSeen(seen); // keep "new" dots visible while the drawer is open
    setOpen(true);
    markRead();
  };

  const chips: { k: Filter; label: string }[] = [
    { k: "all", label: "All" },
    { k: "got", label: t("you_got") },
    { k: "paid", label: t("you_paid") },
  ];

  return (
    <>
      <button
        onClick={openSheet}
        aria-label="Notifications"
        className="relative grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10 active:bg-primary-foreground/20 transition"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[90vw] max-w-sm p-0 flex flex-col gap-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b space-y-3 text-left">
            <div className="flex items-center justify-between pr-8">
              <SheetTitle>Notifications</SheetTitle>
              <button
                onClick={() => { markRead(); setLastSeen(Date.now()); }}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </div>
            <div className="flex gap-2">
              {chips.map((c) => (
                <button
                  key={c.k}
                  onClick={() => setFilter(c.k)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                    filter === c.k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground",
                  )}
                >
                  {c.k === "got" && <span className="h-1.5 w-1.5 rounded-full bg-gain" />}
                  {c.k === "paid" && <span className="h-1.5 w-1.5 rounded-full bg-loss" />}
                  {c.label}
                  <span className="opacity-70">{counts[c.k]}</span>
                </button>
              ))}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center text-center px-8 py-16">
                <div className="relative grid place-items-center h-16 w-16 rounded-2xl bg-primary/10 text-primary">
                  <BellRing className="h-7 w-7" />
                  <span className="absolute -bottom-1 -right-1 grid place-items-center h-6 w-6 rounded-full bg-gain text-primary-foreground">
                    <CheckCheck className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-4 font-semibold">All caught up! 🎉</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When customers or suppliers add entries in shared khatas, alerts will appear here.
                </p>
              </div>
            ) : (
              groups.map((g) => (
                <section key={g.label}>
                  <p className="sticky top-0 z-10 bg-muted/90 backdrop-blur px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </p>
                  <ul>
                    {g.rows.map((i) => {
                      const got = isGot(i.direction);
                      const fresh = new Date(i.created_at).getTime() > lastSeen;
                      const n = name(i.party_id);
                      return (
                        <li key={i.id}>
                          <Link
                            to="/party/$id"
                            params={{ id: i.party_id }}
                            search={{ entry: i.id }}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/60 active:scale-[0.98] transition",
                              fresh && "bg-primary/5",
                            )}
                          >
                            <div className="relative shrink-0">
                              <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary text-sm font-bold">
                                {initials(n)}
                              </div>
                              <span
                                className={cn(
                                  "absolute -bottom-1 -right-1 grid place-items-center h-5 w-5 rounded-full border-2 border-background text-primary-foreground",
                                  got ? "bg-gain" : "bg-loss",
                                )}
                              >
                                {got ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm truncate">{n}</p>
                                {fresh && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="New" />}
                              </div>
                              {i.note && <p className="text-xs text-muted-foreground truncate">“{i.note}”</p>}
                              <p className="text-[11px] text-muted-foreground">{ago(i.created_at)}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={cn("font-bold tabular-nums text-sm", got ? "text-gain" : "text-loss")}>
                                {got ? "+" : "−"} {inr(Number(i.amount))}
                              </p>
                              <span
                                className={cn(
                                  "inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  got ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss",
                                )}
                              >
                                {got ? t("you_got") : t("you_paid")}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
