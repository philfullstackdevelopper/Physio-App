// Script de fond du site installé sur l'écran d'accueil (2026-11-16) : il
// affiche les notifications EasyPhysio (lib/push/send.ts) et ouvre la bonne
// page quand on les touche. Il ne met rien en cache et ne lit aucune donnée.
// Confidentialité : les notifications ne contiennent jamais de donnée de
// santé ni de nom (elles s'affichent sur l'écran verrouillé).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" ? data.title : "EasyPhysio";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/apres-connexion";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/app-icons/icon-192.png",
      badge: "/app-icons/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/apres-connexion";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          await w.focus();
          if ("navigate" in w) await w.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
