const CACHE_NAME = "empire-wars-v3";
const ASSETS_TO_CACHE = [
  "/",
  "/game",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API و HMR نباید کش شوند
  if (url.pathname.startsWith("/api/") || url.pathname.includes("_next/webpack-hmr")) {
    return;
  }

  // برای صفحات HTML: Stale-While-Revalidate (پایداری + تازگی)
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((res) => {
            if (res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // برای بقیه: Network First با fallback به کش
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.status === 200 && event.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
