// Empire Wars Service Worker - Optimized
const CACHE_NAME = "ew-static-v2";

const STATIC_ASSETS = [
  "/globals.css",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ۱. درخواست‌های API یا مسیرهای بازی را هرگز کش نکن (همیشه شبکه)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/game") || url.pathname.startsWith("/admin")) {
    return;
  }

  // ۲. برای بقیه فایل‌های استاتیک (عکس، فونت، استایل): کش-اول
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
