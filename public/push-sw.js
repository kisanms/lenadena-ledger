// Service worker for offline caching & background push notifications
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(d.title || "LenaDena", {
      body: d.body || "Your khata was updated. Tap to see the new balance.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "ld-update",
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Fast activation and offline fallback
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const r = event.request;
  if (r.method !== "GET" || r.mode !== "navigate") return;
  event.respondWith(
    fetch(r)
      .then((res) => {
        const c = res.clone();
        caches.open("ld-pages").then((k) => k.put("/", c));
        return res;
      })
      .catch(() => caches.match("/").then((m) => m || Response.error())),
  );
});
