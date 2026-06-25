"use client";

import { useEffect } from "react";

// ثبت سرویس‌ورکر به‌صورت سراسری و پایدار در همه‌ی صفحات.
// این کار برای معیارهای نصب PWA ضروری است: سرویس‌ورکر باید روی
// صفحه‌ی start_url فعال باشد تا مرورگر امکان «افزودن به صفحه اصلی» را بدهد.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // فقط در محیط امن (https یا localhost) ثبت کن
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // بررسی به‌روزرسانی و فعال‌سازی فوری نسخه‌ی جدید
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                // نسخه‌ی جدید نصب شد؛ در بازدید بعدی فعال می‌شود
                nw.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch((err) => {
          // بی‌صدا نادیده بگیر — بازی بدون سرویس‌ورکر هم کار می‌کند
          console.warn("SW registration failed:", err);
        });
    };

    // پس از لود کامل صفحه ثبت کن تا سرعت لود اولیه تحت تأثیر قرار نگیرد
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
