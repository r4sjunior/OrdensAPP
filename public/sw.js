// Service worker do Ordens: só recebe as notificações push do APOIO DROP.
// Não faz cache de nada (o app continua sempre buscando a versão nova).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Ordens", body: event.data ? event.data.text() : "" };
  }

  const options = {
    body: data.body || "",
    tag: data.tag || "ordens",
    renotify: !data.silent,
    silent: !!data.silent,
    requireInteraction: !!data.urgent,
    icon: "/icon-192",
    badge: "/icon-192",
    vibrate: data.silent ? undefined : data.urgent ? [600, 200, 600, 200, 600, 200, 600] : [200, 100, 200],
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Ordens", options),
      // Se o app estiver aberto, avisa a tela para atualizar na hora.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "apoio" }));
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.postMessage({ type: "apoio" });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
