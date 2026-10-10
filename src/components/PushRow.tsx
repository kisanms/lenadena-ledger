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
    const supported = pushSupported();
    setOk(supported);
    setBlocked(typeof Notification !== "undefined" && Notification.permission === "denied");
    if (supported) {
      isPushOn().then(setOn);
    }
  }, []);

  const toggle = async (v: boolean) => {
    if (!ok) {
      toast.error("Push notifications are not supported in this browser. On iPhone, tap Share → 'Add to Home Screen' first.");
      return;
    }

    if (v && typeof Notification !== "undefined" && Notification.permission === "denied") {
      setBlocked(true);
      toast.error("Notifications are blocked in your browser settings. Please allow them in site permissions.");
      return;
    }

    setBusy(true);
    try {
      if (v) {
        await enablePush();
        setOn(true);
        setBlocked(false);
        toast.success("Notifications turned on!");
      } else {
        await disablePush();
        setOn(false);
        toast.info("Notifications turned off.");
      }
    } catch (e) {
      const err = e as Error;
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setBlocked(true);
      }
      toast.error(err.message || "Failed to update notification settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <Bell className="h-5 w-5 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Notifications</p>
        <p className="text-xs text-muted-foreground">
          {ok ? "Get alerted when someone updates your shared khata." : "Install app to home screen to enable notifications."}
        </p>
      </div>
      <Switch checked={on} disabled={busy} onCheckedChange={toggle} />
      {blocked && (
        <p className="basis-full rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
          Notifications are blocked for this site. Tap the lock/tune icon in the browser address bar (or long-press the installed app icon → App info) → Permissions → Notifications → <strong>Allow</strong>, then refresh.
        </p>
      )}
    </div>
  );
}
