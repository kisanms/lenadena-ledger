import { useState } from "react";
import { toast } from "sonner";
import { PinDots, PinPad } from "./PinPad";
import { checkPin, hasBiometric, markUnlocked, verifyBiometric } from "@/lib/lock";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { session, signOut } = useAuth();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const bio = hasBiometric();

  const tryBio = async () => {
    try {
      if (await verifyBiometric()) {
        markUnlocked();
        onUnlock();
      }
    } catch {
      toast.error("Biometric check failed — use your PIN");
    }
  };


  const press = async (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setErr(false);
    if (next.length === 4) {
      if (await checkPin(next, session!.user.id)) {
        markUnlocked();
        onUnlock();
      } else {
        setErr(true);
        setTimeout(() => setPin(""), 350);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background px-6 py-12">
      <div className="flex flex-col items-center gap-3 mt-6">
        <Logo />
        <p className="text-muted-foreground">Enter your 4-digit PIN</p>
      </div>
      <PinDots value={pin} error={err} />
      {bio && (
        <button onClick={tryBio} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Tap to unlock with fingerprint / face
        </button>
      )}
      <div className="w-full space-y-6">
        <PinPad onDigit={press} onDelete={() => setPin((p) => p.slice(0, -1))} onBio={bio ? tryBio : undefined} />
        <button className="block mx-auto text-sm text-muted-foreground underline" onClick={() => signOut()}>
          Forgot PIN? Log out
        </button>
      </div>
    </div>
  );
}
