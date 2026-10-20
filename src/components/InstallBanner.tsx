import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import { canInstall, isIos, isStandalone, promptInstall, subscribeInstall } from "@/lib/pwa";

const KEY = "ld_install_dismissed";

export function InstallBanner({ always = false }: { always?: boolean }) {
  const [, force] = useState(0);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setReady(true);
    if (!always && localStorage.getItem(KEY)) setHidden(true);
    return subscribeInstall(() => force((n) => n + 1));
  }, [always]);

  if (!ready || hidden || isStandalone()) return null;
  const ios = isIos();
  const native = canInstall();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Download className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Install LenaDena</p>
        {ios ? (
          <p className="text-xs text-muted-foreground">
            Tap <Share className="inline h-3 w-3" /> Share, then "Add to Home Screen".
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Open it like an app, works offline.</p>
        )}
      </div>
      {!ios && (
        <button
          onClick={async () => {
            if (native) await promptInstall();
            else toast.info("Tap the ⋮ browser menu, then \"Install app\" or \"Add to Home screen\".", { duration: 7000 });
          }}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Install
        </button>
      )}
      {!always && (
        <button
          aria-label="Dismiss"
          onClick={() => { localStorage.setItem(KEY, "1"); setHidden(true); }}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
