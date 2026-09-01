self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "IFNMG Assistente", body: event.data ? event.data.text() : "Nova atualização" };
  }
  event.waitUntil(self.registration.showNotification(data.title || "IFNMG Assistente", {
    body: data.body || "Você tem uma nova atualização.",
    icon: data.icon || "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
