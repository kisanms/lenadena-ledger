import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Settings, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddPartyDialog } from "@/components/AddPartyDialog";
import { InstallBanner } from "@/components/InstallBanner";
import { useParties, useProfile, balanceText, type PartyKind } from "@/lib/ledger";
import { useAuth } from "@/lib/auth";
import { inr, initials, fmtDate } from "@/lib/format";
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
  const { data: profile } = useProfile(session?.user.id);
  const { data: parties, isLoading } = useParties();
  const [tab, setTab] = useState<PartyKind>("customer");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const list = useMemo(
    () =>
      (parties ?? []).filter(
        (p) => p.kind === tab && (p.name.toLowerCase().includes(q.toLowerCase()) || (p.phone ?? "").includes(q)),
      ),
    [parties, tab, q],
  );
  const scoped = (parties ?? []).filter((p) => p.kind === tab);
  const toGet = scoped.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const toGive = scoped.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0);

  return (
    <div className="min-h-dvh max-w-md mx-auto pb-28">
      <header className="bg-primary text-primary-foreground px-5 pt-6 pb-20 rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75">Namaste 🙏</p>
            <h1 className="text-2xl font-bold">{profile?.business_name || "My Business"}</h1>
          </div>
          <Link to="/settings" className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 rounded-2xl bg-primary-foreground/10 p-1">
          {(["customer", "supplier"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "h-10 rounded-xl text-sm font-semibold transition-colors",
                tab === k ? "bg-primary-foreground text-primary" : "opacity-80",
              )}
            >
              {k === "customer" ? "Customers" : "Suppliers"}
            </button>
          ))}
        </div>
      </header>

      <div className="-mt-14 mx-4 grid grid-cols-2 rounded-2xl bg-card shadow-lg border overflow-hidden">
        <div className="p-4 border-r">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowDownLeft className="h-3.5 w-3.5 text-gain" /> You'll get</p>
          <p className="text-xl font-bold text-gain mt-1">{inr(toGet)}</p>
        </div>
        <div className="p-4">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowUpRight className="h-3.5 w-3.5 text-loss" /> You'll give</p>
          <p className="text-xl font-bold text-loss mt-1">{inr(toGive)}</p>
        </div>
      </div>

      <div className="mx-4 mt-4 empty:hidden"><InstallBanner /></div>


      <div className="px-4 mt-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="h-12 pl-9 bg-card" placeholder={`Search ${tab}s`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <ul className="mt-3 px-2">
        {isLoading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 m-2 rounded-xl" />)}
        {!isLoading && list.length === 0 && (
          <li className="text-center py-16 px-6 text-muted-foreground">
            <p className="font-display text-lg text-foreground">No {tab}s yet</p>
            <p className="text-sm mt-1">Tap the button below to add your first {tab}.</p>
          </li>
        )}
        {list.map((p) => (
          <li key={p.id}>
            <Link
              to="/party/$id"
              params={{ id: p.id }}
              className="flex items-center gap-3 rounded-xl px-3 py-3 active:bg-secondary"
            >
              <span className="grid place-items-center h-11 w-11 rounded-full bg-secondary text-secondary-foreground font-semibold">
                {initials(p.name)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(p.last_activity)}</p>
              </div>
              <div className="text-right">
                <p className={cn("font-bold", p.balance > 0 ? "text-gain" : p.balance < 0 ? "text-loss" : "text-muted-foreground")}>
                  {inr(p.balance)}
                </p>
                <p className="text-[11px] text-muted-foreground">{balanceText(p.balance)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] inset-x-0 flex justify-center pointer-events-none">
        <Button className="pointer-events-auto h-14 px-6 rounded-full shadow-xl bg-accent text-accent-foreground hover:bg-accent/90 text-base" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-5 w-5" /> Add {tab === "customer" ? "Customer" : "Supplier"}
        </Button>
      </div>
      <AddPartyDialog open={adding} onOpenChange={setAdding} kind={tab} />
    </div>
  );
}
