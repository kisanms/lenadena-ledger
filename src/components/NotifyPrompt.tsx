import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { enablePush, pushSupported } from "@/lib/push";

const KEY = "ld_notify_asked";

// Asks once for notification permission (browsers only allow the popup after a tap).
export function NotifyPrompt() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(pushSupported() && Notification.permission === "default" && !localStorage.getItem(KEY));
  }, []);
  if (!show) return null;
  const close = () => { localStorage.setItem(KEY, "1"); setShow(false); };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <BellRing className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm">Get notified when someone updates your khata.</p>
      <button
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        onClick={async () => {
          try { await enablePush(); toast.success("Notifications on"); } catch (e) { toast.error((e as Error).message); }
          close();
        }}
      >
        Allow
      </button>
      <button aria-label="Dismiss" onClick={close} className="text-muted-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}
