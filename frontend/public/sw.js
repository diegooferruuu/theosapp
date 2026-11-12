// Service worker mínimo: permite instalar la PWA y muestra una página
// sin conexión. No cachea datos del API (siempre se piden frescos).
const CACHE = "theo-v3";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/brand/theo-sleeping.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const url of PRECACHE) {
        const res = await fetch(url, { cache: "reload" });
        // Nunca guardar una redirección (p. ej. al login) en lugar del recurso.
        if (!res.ok || res.redirected) throw new Error(`${url} no disponible`);
        await cache.put(url, res);
      }
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
  const url = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
  } else if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(url.pathname)));
  }
});
