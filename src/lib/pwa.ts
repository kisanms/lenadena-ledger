// Service worker registration + install prompt. Never registers in preview/dev/iframes.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function isPreview() {
  const h = location.hostname;
  let framed = false;
  try { framed = window.self !== window.top; } catch { framed = true; }
  return (
    import.meta.env.DEV || framed || h === "localhost" || h === "127.0.0.1" ||
    h.startsWith("id-preview--") || h.includes("lovableproject.com") || h.endsWith("-dev.lovable.app")
  );
}

export function initPwa() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
  if (!("serviceWorker" in navigator)) return;
  if (isPreview()) {
    // Clean up any worker left over in preview contexts.
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    return;
  }
  // Register right away (not on "load") so the browser's install prompt becomes available sooner.
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

export const canInstall = () => !!deferred;
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
export const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === "accepted";
}

export function subscribeInstall(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
