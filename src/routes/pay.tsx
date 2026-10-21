import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  HelpCircle,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildUpiUri, generateUpiQr, getQrFilename } from "@/lib/upi";

export type PaySearch = {
  pa?: string | undefined;
  to?: string | undefined;
  pn?: string | undefined;
  n?: string | undefined;
  am?: string | undefined;
  a?: string | undefined;
  tn?: string | undefined;
  m?: string | undefined;
};

export const Route = createFileRoute("/pay")({
  validateSearch: (search: Record<string, unknown>): PaySearch => ({
    pa: typeof search["pa"] === "string" ? search["pa"] : undefined,
    to: typeof search["to"] === "string" ? search["to"] : undefined,
    pn: typeof search["pn"] === "string" ? search["pn"] : undefined,
    n: typeof search["n"] === "string" ? search["n"] : undefined,
    am: search["am"] !== undefined ? String(search["am"]) : undefined,
    a: search["a"] !== undefined ? String(search["a"]) : undefined,
    tn: typeof search["tn"] === "string" ? search["tn"] : undefined,
    m: typeof search["m"] === "string" ? search["m"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Direct UPI Khata Payment — LenaDena" },
      {
        name: "description",
        content: "Pay directly to merchant bank account via PhonePe, Google Pay, Paytm, or BHIM.",
      },
    ],
  }),
  component: PayPage,
});

export function PayPage() {
  const search = Route.useSearch();
  const rawPa = search.pa || search.to || "";
  const rawPn = search.pn || search.n || "";
  const rawAm = search.am || search.a;
  const rawTn = search.tn || search.m || "";

  const pa = decodeURIComponent(rawPa).trim();
  const payee = rawPn ? decodeURIComponent(rawPn).trim() : "Shopkeeper";
  const note = rawTn ? decodeURIComponent(rawTn).trim() : "Bill payment";
  const numAm = rawAm ? parseFloat(String(rawAm)) : undefined;

  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrSaved, setQrSaved] = useState(false);

  const upiUri = pa
    ? buildUpiUri({
        pa,
        pn: payee,
        am: numAm,
        tn: note,
      })
    : "";

  useEffect(() => {
    if (upiUri) {
      generateUpiQr(upiUri, 320)
        .then(setQrUrl)
        .catch((err) => console.error("Failed to generate QR:", err));
    }
  }, [upiUri]);

  const copyUpi = () => {
    if (!pa) return;
    navigator.clipboard.writeText(pa);
    setCopied(true);
    toast.success("UPI ID copied! Open your UPI app and paste in 'Pay to UPI ID'");
    setTimeout(() => setCopied(false), 2500);
  };

  const saveQr = () => {
    if (!qrUrl) return;
    const filename = getQrFilename(payee, numAm);
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setQrSaved(true);
    toast.success("QR Code saved to gallery! Open UPI app and scan from gallery.");
  };

  if (!pa) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-background text-foreground">
        <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive grid place-items-center mb-4">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">Invalid Payment Link</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-xs">
          This payment link does not contain a valid UPI ID. Please ask the sender to share an
          updated bill.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto p-4 flex flex-col justify-between bg-background text-foreground">
      {/* Trust Header */}
      <header className="py-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-xs">
          <QrCode className="h-4 w-4" />
          <span>Pay directly using UPI</span>
        </div>
      </header>

      {/* Main Payment Card */}
      <main className="w-full bg-card text-card-foreground border rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 text-center my-auto">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Paying to
          </p>
          <h1 className="text-2xl font-bold text-foreground mt-1 break-words">{payee}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{pa}</p>
        </div>

        {numAm !== undefined && !isNaN(numAm) && numAm > 0 && (
          <div className="py-0.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Amount Due
            </span>
            <div className="text-4xl font-extrabold text-primary font-display mt-0.5 tracking-tight">
              ₹
              {numAm.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {note && (
              <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{note}&rdquo;</p>
            )}
          </div>
        )}

        {/* QR Code Container */}
        {qrUrl ? (
          <div className="flex flex-col items-center">
            <div className="p-3 bg-white rounded-2xl border shadow-sm">
              <img
                src={qrUrl}
                alt={`UPI QR code for ${payee}`}
                className="w-48 h-48 block mx-auto rounded-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <QrCode className="h-3.5 w-3.5" /> Scan with GPay, PhonePe, Paytm, or BHIM
            </p>

            <Button
              size="sm"
              className="mt-2.5 h-10 px-5 font-semibold text-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={saveQr}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Save QR to Gallery
            </Button>

            {qrSaved && (
              <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-left text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
                <p className="font-semibold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  QR image saved to your device!
                </p>
                <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                  Open <strong>GPay, PhonePe, or Paytm</strong>, tap the{" "}
                  <strong>QR Scanner 📷</strong>, and choose{" "}
                  <strong>&ldquo;Scan from Gallery&rdquo;</strong> to pay instantly.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 w-48 mx-auto bg-muted animate-pulse rounded-2xl" />
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <Button
            variant="outline"
            className="w-full h-11 text-xs rounded-xl font-medium"
            onClick={copyUpi}
          >
            {copied ? (
              <Check className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="mr-1.5 h-4 w-4" />
            )}
            {copied ? "Copied UPI ID!" : `Copy UPI ID: ${pa}`}
          </Button>
        </div>

        {/* Manual payment instructions are always visible; direct app intents can be declined. */}
        <div className="p-3.5 bg-muted/60 border rounded-2xl text-left space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span>How to pay manually in 3 quick steps:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed pl-1">
            <li>
              Tap <strong>Copy UPI ID</strong> above.
            </li>
            <li>
              Open <strong>GPay, PhonePe, Paytm, or BHIM</strong>.
            </li>
            <li>
              Tap <strong>&ldquo;Pay to UPI ID&rdquo;</strong>, paste <strong>{pa}</strong>, and
              enter <strong>₹{numAm ? numAm.toFixed(2) : "the due amount"}</strong>.
            </li>
          </ol>
        </div>
      </main>

      {/* Trust Footer */}
      <footer className="text-center py-3 space-y-1">
        <p className="text-[11px] text-muted-foreground">
          LenaDena does not hold your funds. Money transfers directly to the merchant&apos;s bank
          account.
        </p>
      </footer>
    </div>
  );
}
