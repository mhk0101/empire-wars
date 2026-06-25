// سرویس‌ورکر Empire Wars — برای نصب‌پذیری و کار آفلاین PWA
const CACHE_NAME = "empire-wars-v3";
const CORE_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

// نصب: کش کردن دارایی‌های اصلی
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // addAll اگر یک فایل شکست بخورد کلش را خراب می‌کند؛ پس تکی اضافه می‌کنیم
        Promise.allSettled(
          CORE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: "reload" }))
          )
        )
      )
  );
  self.skipWaiting();
});

// فعال‌سازی: پاک‌کردن کش‌های قدیمی و گرفتن کنترل
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// پیام از کلاینت برای فعال‌سازی فوری نسخه‌ی جدید
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// استراتژی fetch:
//   - ناوبری‌ها (HTML): Network Falling Back to Cache (برای پایداری آفلاین)
//   - دارایی‌های استاتیک (next static, تصاویر): Stale While Revalidate (سریع)
//   - درخواست‌های API: همیشه شبکه (هیچ‌وقت کش نمی‌شوند)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // فقط GET را مدیریت کن
  if (req.method !== "GET") return;

  // درخواست‌های API و HMR هرگز کش نمی‌شوند
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("_next/webpack-hmr")
  ) {
    return;
  }

  // ناوبری (بارگذاری صفحه): شبکه اول، در صورت شکست کش
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) => cached || caches.match("/game") || caches.match("/")
          )
        )
    );
    return;
  }

  // دارایی‌های استاتیک: Stale While Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
