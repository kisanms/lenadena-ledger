import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasRecoveryPin, setRecoveryPin } from "@/lib/auth-rpc";

export function RecoveryPinRow() {
  const [isSet, setIsSet] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hasRecoveryPin().then(setIsSet).catch(() => setIsSet(null));
  }, []);

  const submit = async () => {
    if (!/^\d{4}$/.test(a)) return void toast.error("Enter 4 digits");
    if (a !== b) return void toast.error("PINs don't match");
    setBusy(true);
    try {
      const r = await setRecoveryPin(a);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Recovery PIN saved");
      setIsSet(true); setOpen(false); setA(""); setB("");
    } finally { setBusy(false); }
  };

  const pin = (v: string, set: (s: string) => void, ph: string) => (
    <Input className="h-12 text-base tracking-[0.5em]" type="password" inputMode="numeric" maxLength={4} placeholder={ph}
      value={v} onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 4))} />
  );

  return (
    <section className="mx-4 mt-4 rounded-2xl bg-card border">
      <div className="flex items-center gap-3 p-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="font-medium">Password recovery PIN</p>
          <p className="text-xs text-muted-foreground">
            {isSet === null ? "Checking…" : isSet ? "Set — use it if you forget your password" : "Not set — set one now so you can reset your password"}
          </p>
        </div>
      </div>
      {open ? (
        <div className="space-y-3 px-4 pb-4">
          {pin(a, setA, "New PIN")}
          {pin(b, setB, "Confirm PIN")}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      ) : (
        <button className="w-full border-t text-left p-4 text-sm text-primary font-medium" onClick={() => setOpen(true)}>
          {isSet ? "Change recovery PIN" : "Set recovery PIN"}
        </button>
      )}
    </section>
  );
}
