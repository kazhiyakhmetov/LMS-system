/* StudIX service worker — Web Push */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Приходит пуш от сервера → показываем системное уведомление
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "StudIX";
  const options = {
    body: data.body || "",
    icon: "/logo.png",
    badge: "/favicon.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Клик по уведомлению → фокус существующей вкладки или открыть новую
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate?.(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
