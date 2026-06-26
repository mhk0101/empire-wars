"use client";

import { useEffect, useState } from "react";
import { post } from "@/game/client";
import type { Player } from "@/game/client";

interface DailyRewardPopupProps {
  player: Player;
  onClaim: (p: Player) => void;
  notify: (msg: string, ok?: boolean) => void;
}

const DAY_LABELS = ["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم"];

// پاپ‌آپ هوشمند جایزه‌ی روزانه:
// وقتی جایزه آماده باشد، فقط یک‌بار در هر روز به کاربر نشان داده می‌شود.
export default function DailyRewardPopup({
  player,
  onClaim,
  notify,
}: DailyRewardPopupProps) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ day: number; gold: number; gems: number } | null>(null);

  useEffect(() => {
    // آیا جایزه آماده است؟ (هنوز امروز گرفته نشده)
    const claimedToday =
      !!player.lastDailyClaim &&
      new Date(player.lastDailyClaim).toDateString() === new Date().toDateString();
    if (claimedToday) return;

    // فقط یک‌بار در روز نشان بده (با کلید تاریخ در localStorage)
    const todayKey = new Date().toISOString().slice(0, 10);
    const storeKey = `ew_daily_shown_${todayKey}`;
    if (localStorage.getItem(storeKey) === "1") return;

    localStorage.setItem(storeKey, "1");
    // بعد از کمی تأخیر نشان بده تا بازی کامل لود شود
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [player.lastDailyClaim]);

  // اطلاع تلگرام را فقط وقتی پاپ‌آپ واقعاً نشان داده می‌شود، صدا بزن
  useEffect(() => {
    if (!show) return;
    post("/api/daily/notify", {}).catch(() => {});
  }, [show]);

  // روز بعدی بر اساس استریک فعلی
  const nextDay = ((player.dailyStreak % 7) + 1) || 1;
  const dayLabel = DAY_LABELS[Math.min(nextDay - 1, 6)];

  async function claimNow() {
    setBusy(true);
    try {
      const res = await post("/api/daily", {});
      onClaim(res.player);
      setResult({ day: res.day, gold: res.reward.gold ?? 0, gems: res.reward.gems ?? 0 });
    } catch (e) {
      notify((e as Error).message, false);
      setShow(false);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setShow(false);
    if (result) {
      notify(
        result.gems
          ? `پاداش روز ${result.day}: +${result.gems.toLocaleString("fa-IR")} 💎`
          : `پاداش روز ${result.day}: +${result.gold.toLocaleString("fa-IR")} 💰`,
        true
      );
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card-gold card glow w-full max-w-sm overflow-hidden rounded-3xl text-center">
        {result ? (
          // حالت بعد از دریافت
          <div className="p-6">
            <div className="mb-3 text-6xl">🎉</div>
            <h3 className="text-xl font-black gold-text">جایزه‌ت گرفته شد!</h3>
            <p className="mt-3 text-sm text-slate-300">
              پاداش روز{" "}
              <b className="text-[#f5c542]">{result.day.toLocaleString("fa-IR")}</b>
            </p>
            <div className="mt-2 flex items-center justify-center gap-3 text-lg font-bold">
              {result.gold > 0 && (
                <span className="text-emerald-400">
                  +{result.gold.toLocaleString("fa-IR")} 💰
                </span>
              )}
              {result.gems > 0 && (
                <span className="text-cyan-400">
                  +{result.gems.toLocaleString("fa-IR")} 💎
                </span>
              )}
            </div>
            <p className="mt-4 text-[11px] text-slate-400">
              فردا هم بیا تا استرکت حفظ بشه و جایزه‌ت بیشتر بشه! 🎁
            </p>
            <button
              onClick={close}
              className="btn-gold mt-5 w-full rounded-xl py-3 text-sm"
            >
              ادامه بازی
            </button>
          </div>
        ) : (
          // حالت پیشنهاد دریافت
          <div className="p-6">
            <div className="mb-3 text-6xl floaty">🎁</div>
            <h3 className="text-xl font-black gold-text">جایزه‌ی روزانه آماده‌ست!</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              سلام فرمانده! جایزه‌ی ورود{" "}
              <b className="text-[#f5c542]">روز {dayLabel}</b> برات آماده‌ست. هر روز که
              بیای و بگیری، جایزه‌ت بیشتر می‌شه.
            </p>

            {/* پیش‌نمایش روزهای هفته */}
            <div className="mt-4 flex justify-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <div
                  key={d}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold ${
                    d === nextDay
                      ? "bg-[#f5c542] text-[#0a0e1a]"
                      : d < nextDay
                        ? "bg-emerald-900/40 text-emerald-400"
                        : "bg-[#0a0e1a] text-slate-500"
                  }`}
                >
                  {d === 7 ? "💎" : d.toLocaleString("fa-IR")}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              روز هفتم: جایزه‌ی ویژه‌ی جم! 💎
            </p>

            <button
              onClick={claimNow}
              disabled={busy}
              className="btn-gold mt-5 w-full rounded-xl py-3 text-sm"
            >
              {busy ? "در حال دریافت…" : "🎁 دریافت جایزه"}
            </button>
            <button
              onClick={() => setShow(false)}
              className="mt-2 w-full rounded-xl py-2 text-[11px] text-slate-400"
            >
              بعداً یادم بنداز
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
