// سرویس‌ورکر سبک برای نصب‌پذیری PWA
const CACHE = "empire-wars-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// استراتژی کش پیشرفته برای پایداری PWA
const CACHE_NAME = "empire-wars-v2";
const ASSETS_TO_CACHE = [
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
  
  // ۱. درخواست‌های API و فایل‌های Next.js (HMR) نباید کش شوند
  if (url.pathname.startsWith("/api/") || url.pathname.includes("_next/webpack-hmr")) {
    return;
  }

  // ۲. برای بقیه موارد: ابتدا شبکه، اگر نشد کش (Network First)
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // اگر پاسخ اوکی بود، آن را در کش ذخیره/آپدیت کن
        if (res.status === 200 && event.request.method === "GET") {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
