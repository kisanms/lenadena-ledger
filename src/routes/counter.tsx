import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Delete, Download, Share2, RotateCcw, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/ledger";
import { buildUpiUri, generateUpiQr, isValidUpiId } from "@/lib/upi";
import { deliverImage, renderPosCard } from "@/lib/cards";
import { AppModeSwitcher } from "@/components/AppModeSwitcher";

export const Route = createFileRoute("/counter")({
  head: () => ({
    meta: [
      { title: "LenaDena POS — Instant UPI QR at your counter" },
      { name: "description", content: "Enter an amount and show an instant UPI QR to collect payment at your shop counter." },
      { property: "og:title", content: "LenaDena POS" },
      { property: "og:description", content: "Instant UPI QR payment screen for shop counters." },
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

  // "dial" = POS keypad amount entry | "qr" = verified QR card displayed
  const [step, setStep] = useState<"dial" | "qr">("dial");
  const [amt, setAmt] = useState("");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<string[]>(["75%", "5%"]);

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
    if (step !== "qr" || !uri) return;
    let live = true;
    generateUpiQr(uri, 560).then((d) => {
      if (live) setQr(d);
    });
    return () => {
      live = false;
    };
  }, [step, uri]);

  const press = (k: string) => setAmt((a) => (a + k).replace(/^0+/, "").slice(0, 6));
  const addChip = (n: number) => setAmt(String(Math.min(amount + n, 1_00_000)));

  const handleGenerate = () => {
    if (!valid) {
      toast.error("Please add a valid UPI ID in Settings first");
      return;
    }
    setStep("qr");
  };

  const handleNewBill = () => {
    setAmt("");
    setQr("");
    setStep("dial");
  };

  const card = async (mode: "save" | "share") => {
    if (!uri) return;
    setBusy(true);
    try {
      const blob = await renderPosCard({ store, upiId: upi, amount, uri });
      const name = `LenaDena-POS-${amount || "open"}.png`;
      if (mode === "share") {
        const file = new File([blob], name, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              text: `Pay ${amount ? fmt(amount) : ""} to ${store} via UPI: ${upi}`,
            });
          } catch {
            /* share cancelled */
          }
        } else {
          window.open(
            `https://wa.me/?text=${encodeURIComponent(
              `Pay ${amount ? fmt(amount) + " " : ""}to ${store} using UPI ID: ${upi}`,
            )}`,
            "_blank",
          );
        }
      } else {
        await deliverImage(blob, name, "save");
        toast.success("QR card saved to gallery");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="pos-enter min-h-dvh bg-gradient-to-b from-pos to-pos-deep text-pos-foreground select-none"
      style={{ ["--rx" as string]: origin[0], ["--ry" as string]: origin[1] }}
    >
      <div className="max-w-md mx-auto px-4 pt-4 pb-8 flex flex-col min-h-dvh justify-between">
        <div>
          {/* Top Switcher */}
          <AppModeSwitcher current="counter" className="mb-4" />

          {/* Shop Header */}
          <header className="flex items-center justify-between mb-4 px-1">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-widest opacity-75 font-semibold">LenaDena POS</p>
              <h1 className="text-xl font-bold truncate leading-tight">{store}</h1>
            </div>
            {valid && (
              <span className="flex items-center gap-1 rounded-full bg-pos-foreground/15 px-3 py-1 text-xs font-semibold">
                <BadgeCheck className="h-4 w-4 text-emerald-300" /> UPI Active
              </span>
            )}
          </header>

          {!valid ? (
            <div className="rounded-2xl bg-pos-foreground/10 p-6 text-center space-y-3 mt-6 border border-white/10">
              <p className="font-semibold text-base">Add your UPI ID to start collecting payments</p>
              <p className="text-xs opacity-75">Customer payments will go directly to your linked bank account.</p>
              <Link
                to="/settings"
                className="inline-block rounded-xl bg-pos-foreground text-pos px-5 py-2.5 font-bold text-sm shadow-md"
              >
                Open Settings
              </Link>
            </div>
          ) : step === "dial" ? (
            /* ================= STEP 1: MODERN POS DIALER ================= */
            <div className="flex flex-col gap-3">
              {/* Amount Display */}
              <div className="rounded-2xl bg-pos-foreground/10 border border-pos-foreground/15 p-4 text-center shadow-inner">
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">Enter Bill Amount</p>
                <div className="flex items-baseline justify-center gap-1 my-2">
                  <span className="text-2xl font-bold opacity-60">₹</span>
                  <span className="text-5xl font-black tabular-nums tracking-tight">
                    {amt ? Number(amt).toLocaleString("en-IN") : "0"}
                  </span>
                </div>
                <p className="text-[11px] font-mono opacity-60 truncate">UPI: {upi}</p>
              </div>

              {/* Quick Preset Chips */}
              <div className="grid grid-cols-3 gap-2">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => addChip(c)}
                    className="rounded-xl bg-pos-foreground/15 py-2.5 text-xs font-bold active:bg-pos-foreground/30 active:scale-95 transition"
                  >
                    +{fmt(c)}
                  </button>
                ))}
              </div>

              {/* Modern Tactile Keypad */}
              <div className="grid grid-cols-3 gap-2.5 mt-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className="h-13 rounded-2xl bg-pos-foreground/12 text-2xl font-bold active:bg-pos-foreground/25 active:scale-95 transition shadow-sm"
                  >
                    {k}
                  </button>
                ))}
                {/* Clear key */}
                <button
                  onClick={() => setAmt("")}
                  className="h-13 rounded-2xl bg-pos-foreground/12 text-sm font-bold uppercase tracking-wider active:bg-pos-foreground/25 active:scale-95 transition"
                >
                  C
                </button>
                {/* Zero */}
                <button
                  onClick={() => press("0")}
                  className="h-13 rounded-2xl bg-pos-foreground/12 text-2xl font-bold active:bg-pos-foreground/25 active:scale-95 transition shadow-sm"
                >
                  0
                </button>
                {/* Backspace */}
                <button
                  onClick={() => setAmt((a) => a.slice(0, -1))}
                  aria-label="Delete last digit"
                  className="h-13 rounded-2xl bg-pos-foreground/12 grid place-items-center active:bg-pos-foreground/25 active:scale-95 transition"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            /* ================= STEP 2: VERIFIED QR CARD DISPLAY ================= */
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-full rounded-3xl bg-pos-foreground text-pos-deep p-5 flex flex-col items-center shadow-2xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pos/70">
                  {amount > 0 ? "Scan to pay exact amount" : "Scan & pay any amount"}
                </span>
                <p className="text-4xl font-extrabold text-pos tabular-nums mt-1 mb-3">
                  {amount > 0 ? fmt(amount) : "Open Amount"}
                </p>

                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-2xl shadow-inner border border-gray-100 flex items-center justify-center">
                  {qr ? (
                    <img src={qr} alt="UPI payment QR" className="w-60 h-60 object-contain" />
                  ) : (
                    <div className="w-60 h-60 grid place-items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pos" />
                    </div>
                  )}
                </div>

                <div className="w-full mt-3 pt-2.5 border-t border-pos/15 flex items-center justify-between text-xs">
                  <span className="font-semibold text-pos truncate max-w-[170px]">{store}</span>
                  <span className="font-mono text-[11px] opacity-75 truncate max-w-[140px]">{upi}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-3 gap-2">
                <button
                  onClick={handleNewBill}
                  className="flex flex-col items-center gap-1 rounded-xl bg-pos-foreground/15 py-2.5 text-xs font-semibold active:bg-pos-foreground/25 active:scale-95 transition"
                >
                  <RotateCcw className="h-4 w-4" /> Edit / New
                </button>
                <button
                  disabled={busy}
                  onClick={() => card("save")}
                  className="flex flex-col items-center gap-1 rounded-xl bg-pos-foreground text-pos py-2.5 text-xs font-bold active:scale-95 transition disabled:opacity-60 shadow-md"
                >
                  <Download className="h-4 w-4" /> Save Card
                </button>
                <button
                  disabled={busy}
                  onClick={() => card("share")}
                  className="flex flex-col items-center gap-1 rounded-xl bg-pos-foreground text-pos py-2.5 text-xs font-bold active:scale-95 transition disabled:opacity-60 shadow-md"
                >
                  <Share2 className="h-4 w-4" /> WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action (Only shown in Dialer step) */}
        {valid && step === "dial" && (
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleGenerate}
              disabled={amount <= 0}
              className="w-full h-13 rounded-2xl bg-pos-foreground text-pos font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition disabled:opacity-50 disabled:shadow-none"
            >
              <QrCode className="h-5 w-5" />
              {amount > 0 ? `Generate QR for ${fmt(amount)}` : "Enter Amount Above"}
            </button>

            {/* Alternative: Open QR without fixed amount */}
            <button
              onClick={() => {
                setAmt("");
                setStep("qr");
              }}
              className="text-xs opacity-75 hover:opacity-100 py-1 font-semibold text-center underline decoration-dotted"
            >
              Or show Open QR (Customer enters amount)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
