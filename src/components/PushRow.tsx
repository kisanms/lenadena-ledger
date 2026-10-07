import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { disablePush, enablePush, isPushOn, pushSupported } from "@/lib/push";

export function PushRow() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    setOk(pushSupported());
    setBlocked(typeof Notification !== "undefined" && Notification.permission === "denied");
    isPushOn().then(setOn);
  }, []);

  const toggle = async (v: boolean) => {
    if (v && typeof Notification !== "undefined" && Notification.permission === "denied") {
      setBlocked(true);
      return;
    }
    setBusy(true);
    try {
      if (v) { await enablePush(); toast.success("Notifications on"); } else await disablePush();
      setOn(v);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <Bell className="h-5 w-5 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Notifications</p>
        <p className="text-xs text-muted-foreground">
          {ok ? "Get alerted when someone updates your shared khata." : "Install the app to turn on notifications."}
        </p>
      </div>
      <Switch checked={on} disabled={busy || !ok} onCheckedChange={toggle} />
      {blocked && (
        <p className="basis-full rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Notifications are blocked for this site. Tap the lock icon next to the address (or long-press the app icon → App info) → Permissions → Notifications → Allow, then try again.
        </p>
      )}
    </div>
  );
}
