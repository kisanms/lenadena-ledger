import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { VAPID_PUBLIC, VAPID_X, VAPID_Y } from "@/lib/push";

const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (o: object) => b64u(new TextEncoder().encode(JSON.stringify(o)));

async function vapidJwt(aud: string, d: string) {
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: VAPID_X, y: VAPID_Y, d, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const body = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:support@lenadena.app" })}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(body));
  return `${body}.${b64u(sig)}`;
}

// Sends a wake-up push to the other side of a shared khata. Caller must be signed in and part of the khata.
export const Route = createFileRoute("/api/public/push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
        const d = process.env.VAPID_PRIVATE_D;
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!token || !d || !url || !anon) return new Response("unavailable", { status: 400 });
        const { party_id } = (await request.json().catch(() => ({}))) as { party_id?: string };
        if (!party_id) return new Response("bad", { status: 400 });
        const sb = createClient(url, anon, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data } = await sb.rpc("push_targets" as never, { _party: party_id } as never);
        const eps = (data as unknown as string[] | null) ?? [];
        await Promise.all(
          eps.map(async (ep) => {
            const jwt = await vapidJwt(new URL(ep).origin, d);
            const r = await fetch(ep, {
              method: "POST",
              headers: { TTL: "86400", Urgency: "high", Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC}` },
            }).catch(() => null);
            if (r && (r.status === 404 || r.status === 410)) {
              await sb.from("push_subs" as never).delete().eq("endpoint", ep);
            }
          }),
        );
        return Response.json({ sent: eps.length });
      },
    },
  },
});
