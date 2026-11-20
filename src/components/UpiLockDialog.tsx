import { useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { PinDots, PinPad } from "@/components/PinPad";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { checkPin, hasPin } from "@/lib/lock";

/** Verifies the owner (app PIN, or account password if no PIN) before UPI ID can be edited. */
export function UpiLockDialog({ open, onOpenChange, uid, email, onUnlocked }: {
  open: boolean; onOpenChange: (o: boolean) => void; uid: string; email?: string | null | undefined; onUnlocked: () => void;
}) {
  const [pin, setPinVal] = useState("");
  const [err, setErr] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const usePin = typeof window !== "undefined" && hasPin();

  const done = () => { setPinVal(""); setPw(""); onOpenChange(false); onUnlocked(); toast.success("UPI ID unlocked for editing"); };

  const digit = async (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPinVal(next); setErr(false);
    if (next.length === 4) {
      if (await checkPin(next, uid)) done();
      else { setErr(true); setTimeout(() => setPinVal(""), 400); }
    }
  };

  const verifyPw = async () => {
    if (!email) { toast.error("Set an app PIN in Settings first"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) { toast.error("Wrong password"); return; }
    done();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) { setPinVal(""); setPw(""); } onOpenChange(o); }}>
      <DrawerContent className="pb-8">
        <DrawerHeader><DrawerTitle>{usePin ? "Enter app PIN to change UPI ID" : "Enter your password to change UPI ID"}</DrawerTitle></DrawerHeader>
        {usePin ? (
          <div className="space-y-6 px-4">
            <PinDots value={pin} error={err} />
            <PinPad onDigit={digit} onDelete={() => setPinVal((p) => p.slice(0, -1))} />
          </div>
        ) : (
          <div className="space-y-3 px-4">
            <Input type="password" className="h-12" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Account password" autoFocus />
            <Button className="w-full h-12" disabled={!pw || busy} onClick={verifyPw}>Unlock</Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
