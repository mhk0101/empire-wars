"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LAST_KEY = "ew_install_prompt_date";
const INSTALLED_KEY = "ew_installed";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    // اگر قبلاً نصب شده یا در حالت standalone است، چیزی نشان نده
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === "1") return;

    // فقط یک‌بار در روز پیشنهاد بده
    const shownToday = localStorage.getItem(LAST_KEY) === todayStr();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!shownToday) {
        setTimeout(() => setShow(true), 2500);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS از beforeinstallprompt پشتیبانی نمی‌کند → راهنما نشان بده
    if (isIOS() && !shownToday) {
      setTimeout(() => {
        setShow(true);
        setIosHelp(true);
      }, 2500);
    }

    window.addEventListener("appinstalled", () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setShow(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(LAST_KEY, todayStr());
    setShow(false);
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem(INSTALLED_KEY, "1");
      }
      setDeferred(null);
      dismiss();
    } else {
      // iOS یا مرورگری که prompt ندارد → راهنما
      setIosHelp(true);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3">
      <div className="card-gold card glow mx-auto max-w-md rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f5c542] to-[#c9971f] text-2xl">
            👑
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-slate-100">
              Empire Wars را نصب کن!
            </div>
            <p className="mt-0.5 text-[11px] text-slate-300">
              بازی را به صفحه اصلی موبایلت اضافه کن تا مثل یک اپلیکیشن، سریع و
              تمام‌صفحه بازی کنی.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-500"
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        {iosHelp ? (
          <div className="mt-3 rounded-xl bg-[#0a0e1a] p-3 text-[11px] leading-relaxed text-slate-300">
            برای نصب در آیفون:
            <br />
            ۱) دکمه‌ی <b>اشتراک‌گذاری</b> (مربع با فلش رو به بالا ⬆️) را بزن.
            <br />
            ۲) گزینه‌ی <b>«Add to Home Screen»</b> را انتخاب کن.
            <div className="mt-2 text-left">
              <button
                onClick={dismiss}
                className="btn-gold rounded-lg px-4 py-1.5 text-xs"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={dismiss}
              className="card flex-1 rounded-xl py-2.5 text-xs text-slate-300"
            >
              بعداً
            </button>
            <button
              onClick={install}
              className="btn-gold flex-[2] rounded-xl py-2.5 text-sm"
            >
              ⬇️ نصب روی موبایل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
