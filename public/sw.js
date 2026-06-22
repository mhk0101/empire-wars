// سرویس‌ورکر سبک برای نصب‌پذیری PWA
const CACHE = "empire-wars-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// استراتژی شبکه-اول؛ در صورت آفلاین بودن، از کش پاسخ بده
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // درخواست‌های API را کش نکن
  if (new URL(req.url).pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
