// Self-destructing no-op SW — unregisters itself and deletes all caches
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((cs) => cs.forEach((c) => c.navigate(c.url).catch(() => {}))),
      ),
  )
})
self.addEventListener("fetch", (event) => event.respondWith(fetch(event.request)))
