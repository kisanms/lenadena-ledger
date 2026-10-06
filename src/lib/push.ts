import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC = "BNEQ2UUUhBvZf5d3UZ5KS-_aMzCdd7fTs4aJ21by8dBlAINTVy9S9wpV2mAQxIVSOXQcveuZmGjUuAj6zoCRf5k";
export const VAPID_X = "0RDZRRSEG9l_l3dRnkpL79ozMJ13t9OzhonbVvLx0GU";
export const VAPID_Y = "AINTVy9S9wpV2mAQxIVSOXQcveuZmGjUuAj6zoCRf5k";

const toBytes = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function isPushOn() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("This browser can't show notifications. On iPhone, install the app first.");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications were blocked");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(VAPID_PUBLIC) }));
  const { error } = await supabase.from("push_subs" as never).upsert({ endpoint: sub.endpoint } as never);
  if (error) throw error;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subs" as never).delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/** Fire-and-forget: wake the other side's phones after a change. */
export async function notifyParty(party_id: string) {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) return;
  fetch("/api/public/push", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
    body: JSON.stringify({ party_id }),
  }).catch(() => {});
}
