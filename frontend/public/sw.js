// Service worker mínimo: permite instalar la PWA y muestra una página
// sin conexión. No cachea datos del API (siempre se piden frescos).
const CACHE = "theo-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(OFFLINE_URL, { cache: "reload" });
      // Nunca guardar una redirección (p. ej. al login) como página sin conexión.
      if (!res.ok || res.redirected) throw new Error("offline.html no disponible");
      const cache = await caches.open(CACHE);
      await cache.put(OFFLINE_URL, res);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
