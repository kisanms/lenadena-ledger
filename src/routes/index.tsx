import { useEffect, useMemo, useRef, useState } from "react";
import { AppModeSwitcher } from "@/components/AppModeSwitcher";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Settings, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddPartyDialog } from "@/components/AddPartyDialog";
import { InstallBanner } from "@/components/InstallBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { NotifyPrompt } from "@/components/NotifyPrompt";
import { useParties, useProfile, useDues, balanceText, type PartyKind } from "@/lib/ledger";
import { DueBadge } from "@/components/DueBadge";
import { TodaySummary } from "@/components/TodaySummary";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { inr, initials, fmtDate, formatPhone, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LenaDena — Digital Khata for Indian Shops" },
      { name: "description", content: "Track money to receive and pay for customers and suppliers, with WhatsApp receipts." },
      { property: "og:title", content: "LenaDena — Digital Khata" },
      { property: "og:description", content: "The simple ledger app for Indian merchants, shopkeepers and suppliers." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useAuth();
  const { t, lang } = useI18n();
  const { data: profile } = useProfile(session?.user.id);
  const { data: parties, isLoading } = useParties();
  const { data: dues } = useDues();
  const [tab, setTab] = useState<PartyKind>("customer");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  // Smooth mode transition animation
  const [animateKhata, setAnimateKhata] = useState(false);
  const [khataOrigin, setKhataOrigin] = useState(["25%", "5%"]);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("ld_animate_khata") === "true") {
      setAnimateKhata(true);
      sessionStorage.removeItem("ld_animate_khata");
      const o = sessionStorage.getItem("ld_khata_origin");
      if (o) setKhataOrigin(o.split(","));
    }
  }, []);

  // Swipe gesture tracking
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      window.close();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const customerCount = useMemo(
    () => (parties ?? []).filter((p) => p.kind === "customer").length,
    [parties]
  );
  const supplierCount = useMemo(
    () => (parties ?? []).filter((p) => p.kind === "supplier").length,
    [parties]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const diffX = touch.clientX - touchStart.current.x;
    const diffY = touch.clientY - touchStart.current.y;

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0 && tab === "customer") {
        setTab("supplier");
      } else if (diffX > 0 && tab === "supplier") {
        setTab("customer");
      }
    }
    touchStart.current = null;
  };

  const filtered = useMemo(() => {
    const list = (parties ?? []).filter((p) => p.kind === tab);
    if (!q.trim()) return list;
    const term = q.trim().toLowerCase();
    const queryNormPhone = normalizePhone(term);
    return list.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(term);
      const rawPhoneMatch = p.phone && p.phone.toLowerCase().includes(term);
      const normPhoneMatch =
        queryNormPhone.length >= 3 &&
        p.phone &&
        normalizePhone(p.phone).includes(queryNormPhone);
      return nameMatch || rawPhoneMatch || normPhoneMatch;
    });
  }, [parties, tab, q]);

  const scoped = (parties ?? []).filter((p) => p.kind === tab);
  const toGet = scoped.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const toGive = scoped.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0);

  return (
    <div
      className={cn(
        "min-h-dvh max-w-md mx-auto pb-28 touch-pan-y",
        animateKhata && "khata-enter"
      )}
      style={animateKhata ? { ["--rx" as string]: khataOrigin[0], ["--ry" as string]: khataOrigin[1] } : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="bg-primary text-primary-foreground px-5 pt-4 pb-20 rounded-b-[2rem]">
        {/* Top Mode Switcher */}
        <AppModeSwitcher current="khata" className="mb-4" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75">{t("greeting_namaste", "Namaste 🙏")}</p>
            <h1 className="text-2xl font-bold">{profile?.business_name || "My Business"}</h1>
          </div>
          <div className="flex gap-2">
            <NotificationBell />
            <Link to="/settings" className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 rounded-2xl bg-primary-foreground/10 p-1">
          {(["customer", "supplier"] as const).map((k) => {
            const count = k === "customer" ? customerCount : supplierCount;
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "h-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  active
                    ? "bg-primary-foreground text-primary shadow-sm"
                    : "opacity-80 hover:opacity-100",
                )}
                aria-selected={active}
                role="tab"
              >
                <span>{k === "customer" ? t("customers") : t("suppliers")}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-bold transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-primary-foreground/20 text-primary-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="-mt-14 mx-4 grid grid-cols-2 rounded-2xl bg-card shadow-lg border overflow-hidden">
        <div className="p-4 border-r">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowDownLeft className="h-3.5 w-3.5 text-gain" /> {t("you_will_get")}</p>
          <p className="text-xl font-bold text-gain mt-1">{inr(toGet)}</p>
        </div>
        <div className="p-4">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowUpRight className="h-3.5 w-3.5 text-loss" /> {t("you_will_give")}</p>
          <p className="text-xl font-bold text-loss mt-1">{inr(toGive)}</p>
        </div>
      </div>

      <div className="mx-4 mt-4"><TodaySummary /></div>
      <div className="mx-4 mt-4 empty:hidden"><InstallBanner /></div>
      <div className="mx-4 mt-3 empty:hidden"><NotifyPrompt /></div>

      <div className="px-4 mt-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "customer" ? t("search_customer") : t("search_supplier")}
            className="pl-9 h-11 bg-card rounded-xl"
          />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-18 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4 text-muted-foreground">
            <p className="font-medium">
              {q ? t("no_results_found", "No matching party found") : tab === "customer" ? t("no_customers_yet") : t("no_suppliers_yet")}
            </p>
            <p className="text-xs mt-1 opacity-75">
              {q ? t("try_searching_again", "Try searching with a different name or number") : t("add_first_party_hint", "Tap '+ Add' below to start tracking")}
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const due = dues?.[p.id];
            return (
              <Link
                key={p.id}
                to="/party/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-card border shadow-xs hover:border-primary/40 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold grid place-items-center shrink-0 text-sm">
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatPhone(p.phone) || t("no_phone")}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("font-bold tabular-nums text-base", p.balance > 0 ? "text-gain" : p.balance < 0 ? "text-loss" : "text-muted-foreground")}>
                    {inr(Math.abs(p.balance))}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">{balanceText(p.balance, t)}</p>
                  {due && <div className="mt-0.5 flex justify-end"><DueBadge due={due} /></div>}
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="fixed bottom-6 left-0 right-0 max-w-md mx-auto px-4 pointer-events-none">
        <Button
          onClick={() => setAdding(true)}
          className="w-full h-13 rounded-2xl shadow-xl font-bold text-base gap-2 pointer-events-auto"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          {tab === "customer" ? t("add_customer") : t("add_supplier")}
        </Button>
      </div>

      <AddPartyDialog
        open={adding}
        onOpenChange={setAdding}
        defaultKind={tab}
      />
    </div>
  );
}
