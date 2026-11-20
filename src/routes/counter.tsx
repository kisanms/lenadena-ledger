import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Delete, Download, Share2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/ledger";
import { buildUpiUri, generateUpiQr, isValidUpiId } from "@/lib/upi";
import { deliverImage, renderPosCard } from "@/lib/cards";

export const Route = createFileRoute("/counter")({
  head: () => ({
    meta: [
      { title: "LenaDena Counter Pay — UPI QR at your counter" },
      { name: "description", content: "Enter an amount and show a live UPI QR to collect payment at the shop counter." },
      { property: "og:title", content: "LenaDena Counter Pay" },
      { property: "og:description", content: "Soundbox-style UPI QR payment screen for shop counters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CounterPay,
});

const CHIPS = [50, 100, 200, 500, 1000, 2000];
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

function CounterPay() {
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);
  const navigate = useNavigate();
  const [amt, setAmt] = useState("");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<string[]>(["90%", "8%"]);

  useEffect(() => {
    const o = sessionStorage.getItem("ld_pos_origin");
    if (o) setOrigin(o.split(","));
  }, []);

  const upi = ((profile as Record<string, unknown> | undefined)?.["upi_id"] as string | undefined)?.trim() || "";
  const store = profile?.business_name || profile?.owner_name || "My Shop";
  const valid = isValidUpiId(upi);
  const amount = Math.min(Number(amt || 0), 1_00_000);
  const uri = useMemo(
    () => (valid ? buildUpiUri({ pa: upi, pn: store, am: amount > 0 ? amount : null, tn: "Counter payment" }) : ""),
    [valid, upi, store, amount],
  );

  useEffect(() => {
    if (!uri) return setQr("");
    let live = true;
    const t = setTimeout(() => generateUpiQr(uri, 520).then((d) => live && setQr(d)), 150);
    return () => { live = false; clearTimeout(t); };
  }, [uri]);

  const press = (k: string) => setAmt((a) => (a + k).replace(/^0+/, "").slice(0, 6));
  const addChip = (n: number) => setAmt(String(Math.min(amount + n, 1_00_000)));

  const card = async (mode: "save" | "share") => {
    if (!uri) return;
    setBusy(true);
    try {
      const blob = await renderPosCard({ store, upiId: upi, amount, uri });
      const name = `LenaDena-CounterPay-${amount || "open"}.png`;
      if (mode === "share") {
        const file = new File([blob], name, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], text: `Pay ${amount ? fmt(amount) : ""} to ${store} via UPI: ${upi}` }); } catch { /* cancelled */ }
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(`Pay ${amount ? fmt(amount) + " " : ""}to ${store} using UPI ID: ${upi}`)}`, "_blank");
        }
      } else {
        await deliverImage(blob, name, "save");
        toast.success("QR card saved");
      }
    } finally { setBusy(false); }
  };

  return (
    <div
      className="pos-enter min-h-dvh bg-gradient-to-b from-pos to-pos-deep text-pos-foreground"
      style={{ ["--rx" as string]: origin[0], ["--ry" as string]: origin[1] }}
    >
      <div className="max-w-md mx-auto px-5 pt-5 pb-8 flex flex-col gap-4">
        <header className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/" })} aria-label="Back to khata" className="grid place-items-center h-10 w-10 rounded-full bg-pos-foreground/15">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest opacity-70">Counter Pay <span className="ml-1 rounded bg-pos-foreground/20 px-1.5 py-0.5 text-[9px]">BETA</span></p>
            <h1 className="text-lg font-bold truncate">{store}</h1>
          </div>
          {valid && (
            <span className="flex items-center gap-1 rounded-full bg-pos-foreground/15 px-2.5 py-1 text-[11px] font-semibold">
              <BadgeCheck className="h-3.5 w-3.5" /> UPI
            </span>
          )}
        </header>

        {!valid ? (
          <div className="rounded-2xl bg-pos-foreground/10 p-5 text-center space-y-3">
            <p className="font-semibold">Add your UPI ID to start collecting</p>
            <Link to="/settings" className="inline-block rounded-xl bg-pos-foreground text-pos px-4 py-2 font-semibold">Open Settings</Link>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-pos-foreground text-pos-deep p-4 flex flex-col items-center shadow-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pos/70">
                {amount > 0 ? "Amount to pay" : "Scan & pay any amount"}
              </p>
              <p className="text-4xl font-extrabold text-pos tabular-nums my-1">{fmt(amount)}</p>
              {qr ? <img src={qr} alt="UPI payment QR" className="w-56 h-56" /> : <div className="w-56 h-56" />}
              <p className="font-mono text-xs mt-1 opacity-70">{upi}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CHIPS.map((c) => (
                <button key={c} onClick={() => addChip(c)} className="rounded-xl bg-pos-foreground/15 py-2 text-sm font-semibold active:bg-pos-foreground/30">
                  +{fmt(c)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"].map((k) => (
                <button key={k} onClick={() => press(k)} className="h-12 rounded-xl bg-pos-foreground/10 text-xl font-semibold active:bg-pos-foreground/25">{k}</button>
              ))}
              <button onClick={() => setAmt((a) => a.slice(0, -1))} aria-label="Delete" className="h-12 rounded-xl bg-pos-foreground/10 grid place-items-center active:bg-pos-foreground/25">
                <Delete className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setAmt("")} className="flex flex-col items-center gap-1 rounded-xl bg-pos-foreground/10 py-2.5 text-xs font-semibold">
                <RotateCcw className="h-4 w-4" /> New bill
              </button>
              <button disabled={busy} onClick={() => card("save")} className="flex flex-col items-center gap-1 rounded-xl bg-pos-foreground text-pos py-2.5 text-xs font-semibold disabled:opacity-60">
                <Download className="h-4 w-4" /> Download card
              </button>
              <button disabled={busy} onClick={() => card("share")} className="flex flex-col items-center gap-1 rounded-xl bg-pos-foreground text-pos py-2.5 text-xs font-semibold disabled:opacity-60">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
