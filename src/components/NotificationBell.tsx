import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useParties } from "@/lib/ledger";
import { inr, fmtDate } from "@/lib/format";

const SEEN = "ld_notif_seen";

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
    navigator.vibrate?.(120);
  } catch { /* sound unavailable */ }
}

/** Bell showing entries other people recorded in khatas shared with me. */
export function NotificationBell() {
  const { session } = useAuth();
  const me = session?.user.id;
  const qc = useQueryClient();
  const { data: parties } = useParties();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);

  useEffect(() => setSeen(Number(localStorage.getItem(SEEN) || 0)), []);

  const { data: items = [] } = useQuery({
    queryKey: ["notifs", me],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("entries")
        .select("id, party_id, direction, amount, created_at, user_id")
        .neq("user_id", me!)
        .order("created_at", { ascending: false })
        .limit(30);
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
    return () => { supabase.removeChannel(ch); };
  }, [me, qc]);

  const unread = items.filter((i) => new Date(i.created_at).getTime() > seen).length;
  const name = (id: string) => parties?.find((p) => p.id === id)?.name ?? "Someone";

  const navigate = useNavigate();
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const [holding, setHolding] = useState(false);
  const startHold = (e: React.PointerEvent<HTMLButtonElement>) => {
    held.current = false;
    setHolding(true);
    const r = e.currentTarget.getBoundingClientRect();
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setHolding(false);
      sessionStorage.setItem("ld_pos_origin", `${Math.round(((r.left + r.width / 2) / window.innerWidth) * 100)}%,${Math.round(((r.top + r.height / 2) / window.innerHeight) * 100)}%`);
      navigate({ to: "/counter" });
    }, 2000);
  };
  const cancelHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
  };

  const openSheet = () => {
    if (held.current) { held.current = false; return; }
    setOpen(true);
    const now = Date.now();
    localStorage.setItem(SEEN, String(now));
    setSeen(now);
  };

  return (
    <>
      <button
        onClick={openSheet}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Notifications (hold 2s for Counter Pay)"
        className="relative grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10 select-none touch-none"
      >
        <Bell className="h-5 w-5" />
        {holding && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="126" style={{ animation: "hold-ring 2s linear forwards" }} />
          </svg>
        )}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[88vw] max-w-sm p-0">
          <SheetHeader className="p-4 border-b"><SheetTitle>Notifications</SheetTitle></SheetHeader>
          <ul className="overflow-y-auto max-h-[calc(100dvh-4rem)]">
            {items.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">No updates yet</li>}
            {items.map((i) => {
              // Mirrored: their "gave" means I got.
              const got = i.direction === "gave";
              return (
                <li key={i.id}>
                  <Link to="/party/$id" params={{ id: i.party_id }} onClick={() => setOpen(false)} className="block px-4 py-3 border-b hover:bg-muted">
                    <p className="text-sm">
                      <span className="font-semibold">{name(i.party_id)}</span> recorded{" "}
                      <span className={got ? "text-gain font-semibold" : "text-loss font-semibold"}>
                        {inr(Number(i.amount))} {got ? "you got" : "you paid"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(i.created_at)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
