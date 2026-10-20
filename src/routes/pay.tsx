import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildUpiUri, generateUpiQr } from "@/lib/upi";

export type PaySearch = {
    pa?: string | undefined;
    pn?: string | undefined;
    am?: string | undefined;
    tn?: string | undefined;
};

export const Route = createFileRoute("/pay")({
    validateSearch: (search: Record<string, unknown>): PaySearch => ({
        pa: typeof search["pa"] === "string" ? search["pa"] : undefined,
        pn: typeof search["pn"] === "string" ? search["pn"] : undefined,
        am: search["am"] !== undefined ? String(search["am"]) : undefined,
        tn: typeof search["tn"] === "string" ? search["tn"] : undefined,
    }),
    head: () => ({
        meta: [
            { title: "Pay via UPI — LenaDena" },
            { name: "description", content: "Instant direct bank payment via UPI, PhonePe, Google Pay or Paytm." },
        ],
    }),
    component: PayPage,
});

function PayPage() {
    const { pa, pn, am, tn } = Route.useSearch();
    const [copied, setCopied] = useState(false);
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    const numAm = am ? parseFloat(String(am)) : undefined;
    const payee = pn ?? "Shopkeeper";
    const note = tn ?? "Bill payment";

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
            generateUpiQr(upiUri, 300).then(setQrUrl).catch(console.error);

            // Auto-launch UPI on mobile devices after short initial delay if user arrived via WhatsApp
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isMobile) {
                const timer = setTimeout(() => {
                    window.location.href = upiUri;
                }, 600);
                return () => {
                    clearTimeout(timer);
                };
            }
        }
        return undefined;
    }, [upiUri]);

    const copyUpi = () => {
        if (!pa) return;
        navigator.clipboard.writeText(pa);
        setCopied(true);
        toast.success("UPI ID copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const openApp = () => {
        if (!pa) return;
        window.location.href = upiUri;
    };

    if (!pa) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mb-3">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold">Invalid Payment Link</h1>
                <p className="text-muted-foreground mt-2 text-sm max-w-xs">
                    This payment link doesn&apos;t contain a valid merchant UPI ID.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-dvh max-w-md mx-auto p-4 flex flex-col justify-between">
            <header className="py-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verified Direct UPI Transfer</span>
                </div>
            </header>

            <main className="w-full bg-card border rounded-3xl p-6 shadow-sm space-y-6 text-center my-auto">
                <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Paying to</p>
                    <h1 className="text-2xl font-bold text-foreground mt-1 break-words">{payee}</h1>
                </div>

                {numAm !== undefined && !isNaN(numAm) && numAm > 0 && (
                    <div className="py-1">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">Amount to Pay</span>
                        <div className="text-4xl font-extrabold text-primary font-display mt-0.5">
                            ₹{numAm.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </div>
                        {note && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{note}&rdquo;</p>}
                    </div>
                )}

                {qrUrl ? (
                    <div className="flex flex-col items-center">
                        <div className="p-3 bg-white rounded-2xl border shadow-sm">
                            <img src={qrUrl} alt="UPI Payment QR Code" className="w-48 h-48 block mx-auto" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                            <QrCode className="h-3.5 w-3.5" /> Scan with GPay, PhonePe, Paytm or BHIM
                        </p>
                    </div>
                ) : (
                    <div className="h-48 w-48 mx-auto bg-muted animate-pulse rounded-2xl" />
                )}

                <div className="space-y-2.5 pt-1">
                    <Button
                        className="w-full h-12 text-base font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={openApp}
                    >
                        <Smartphone className="mr-2 h-5 w-5" /> Pay with Any UPI App
                    </Button>

                    <Button variant="outline" className="w-full h-11 text-xs" onClick={copyUpi}>
                        {copied ? <Check className="mr-1.5 h-4 w-4 text-gain" /> : <Copy className="mr-1.5 h-4 w-4" />}
                        Copy UPI ID: <span className="font-mono ml-1 font-semibold">{pa}</span>
                    </Button>
                </div>
            </main>

            <footer className="text-center py-4 space-y-1">
                <p className="text-[11px] text-muted-foreground">
                    LenaDena digital khata does not hold your money. Funds go directly to the merchant bank account.
                </p>
                <p className="text-[10px] text-muted-foreground/75 font-mono">0% transaction fees · Zero commission</p>
            </footer>
        </div>
    );
}