// Minimal service worker just for Web Push — no offline caching, since this
// app always needs a live connection to the backend anyway.
self.addEventListener("push", (event) => {
  let data = { title: "FM Support", body: "You have a new notification." };
  try {
    data = event.data.json();
  } catch {
    // ignore malformed payloads, fall back to the default above
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/public/logo/No_BG.png",
      badge: "/public/logo/No_BG.png",
      data: { url: data.url || "/internal" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/internal";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
