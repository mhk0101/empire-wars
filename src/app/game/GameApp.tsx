"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  fa,
  faShort,
  getDeviceToken,
  getJSON,
  type Player,
  type BuildJob,
  type TrainJob,
} from "@/game/client";
import NameModal from "./NameModal";
import InstallPrompt from "./InstallPrompt";
import HomeTab from "./tabs/HomeTab";
import CityTab from "./tabs/CityTab";
import TroopsTab from "./tabs/TroopsTab";
import ResearchTab from "./tabs/ResearchTab";
import AttackTab from "./tabs/AttackTab";
import MarketTab from "./tabs/MarketTab";
import ClanTab from "./tabs/ClanTab";
import RankTab from "./tabs/RankTab";
import ShopTab from "./tabs/ShopTab";
import MoreTab from "./tabs/MoreTab";

export interface MeData {
  player: Player;
  rates: Record<string, number>;
  capacity: number;
  clan: { id: number; name: string; tag: string } | null;
  rank: number;
  xp: { level: number; current: number; needed: number };
  army: number;
  queues: { builds: BuildJob[]; trains: TrainJob[] };
  server: { online: number; players: number; clans: number };
  now: string;
}

const TABS = [
  { id: "home", label: "خانه", emoji: "🏠" },
  { id: "city", label: "شهر", emoji: "🏰" },
  { id: "troops", label: "نیروها", emoji: "⚔️" },
  { id: "research", label: "تحقیق", emoji: "🔬" },
  { id: "attack", label: "حمله", emoji: "🎯" },
  { id: "market", label: "بازار", emoji: "🏪" },
  { id: "clan", label: "کلن", emoji: "🛡️" },
  { id: "rank", label: "رتبه", emoji: "🏆" },
  { id: "shop", label: "فروشگاه", emoji: "💎" },
  { id: "more", label: "بیشتر", emoji: "✨" },
];

export default function GameApp() {
  const [data, setData] = useState<MeData | null>(null);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showName, setShowName] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // فقط یک‌بار مودال نام را در ابتدای کار بررسی کن
  const nameCheckedRef = useRef(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await getJSON("/api/me");
      if (!d?.player) {
        setLoadError(d?.error || "اتصال به سرور برقرار نشد.");
        return;
      }
      setLoadError(null);
      setData(d);
      // بررسی نام کاربری فقط در اولین بارگذاری
      if (!nameCheckedRef.current) {
        nameCheckedRef.current = true;
        if (d.player && !d.player.nameChosen) {
          setShowName(true);
        }
      }
    } catch (e) {
      setLoadError((e as Error).message || "خطا در اتصال");
    }
  }, []);

  // ابتدا توکن دستگاه را تثبیت کن، سپس داده‌ها را بگیر (تا همه درخواست‌ها یک توکن داشته باشند)
  useEffect(() => {
    getDeviceToken();
    refresh();
  }, [refresh]);

  // اگر بعد ۱۲ ثانیه هنوز داده نیامده، خطای timeout نشان بده
  useEffect(() => {
    if (data) return;
    const t = setTimeout(() => {
      setLoadError((prev) => prev || "سرور کند است؛ لطفاً صبر کنید یا دوباره تلاش کنید.");
    }, 12000);
    return () => clearTimeout(t);
  }, [data]);

  // به‌روزرسانی منابع هر ۳۰ ثانیه (interval فقط یک‌بار ساخته می‌شود)
  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const notify = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // اسکرول خودکار تب فعال به مرکز اسلایدر
  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const active = bar.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    active?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [tab]);

  // تیک هر ثانیه: رشد منابع + ساعت برای شمارش معکوس + رفرش هنگام پایان صف
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      let shouldRefresh = false;
      setData((prev) => {
        if (!prev) return prev;
        // اگر کاری از صف تمام شده، از سرور رفرش بگیر
        const allJobs = [...prev.queues.builds, ...prev.queues.trains];
        if (allJobs.some((j) => new Date(j.finishAt).getTime() <= now)) {
          shouldRefresh = true;
        }
        const cap = prev.capacity;
        const p = {
          ...prev.player,
          gold: Math.min(cap, prev.player.gold + prev.rates.gold / 3600),
          food: Math.min(cap, prev.player.food + prev.rates.food / 3600),
          stone: Math.min(cap, prev.player.stone + prev.rates.stone / 3600),
          iron: Math.min(cap, prev.player.iron + prev.rates.iron / 3600),
        };
        return { ...prev, player: p };
      });
      if (shouldRefresh) refresh();
    }, 1000);
    return () => clearInterval(t);
  }, [refresh]);

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-md text-center">
          <div className="floaty mb-4 text-6xl">🏰</div>
          {loadError ? (
            <>
              <p className="mb-3 font-bold text-rose-400">خطا در بارگذاری بازی</p>
              <p className="mb-4 text-sm text-slate-300">{loadError}</p>
              <button
                onClick={() => refresh()}
                className="btn-gold rounded-xl px-6 py-2 text-sm"
              >
                تلاش دوباره 🔄
              </button>
            </>
          ) : (
            <p className="text-slate-400">در حال بارگذاری امپراتوری…</p>
          )}
        </div>
      </div>
    );
  }

  const p = data.player;
  const setPlayer = (np: Player) =>
    setData((prev) => (prev ? { ...prev, player: np } : prev));

  const props = { data, setPlayer, refresh, notify, nowMs };

  const vipActive = !!p.vipUntil && new Date(p.vipUntil).getTime() > Date.now();

  const resources: [string, string, number][] = [
    ["💰", "gold", Math.floor(p.gold)],
    ["🌾", "food", Math.floor(p.food)],
    ["⛏️", "stone", Math.floor(p.stone)],
    ["⚙️", "iron", Math.floor(p.iron)],
    ["💎", "gems", p.gems],
  ];

  return (
    <div className="min-h-screen pb-10">
      {/* پس‌زمینه */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#16203a_0%,#0a0e1a_70%)]" />

      {/* هدر منابع */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0e1a]/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <Link href="/" className="text-sm font-black gold-text">
              👑 Empire Wars
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <button
                onClick={() => setShowName(true)}
                className="flex items-center gap-1 rounded-lg bg-[#1a2440] px-2 py-1 transition hover:bg-[#22305a]"
                title="تغییر نام کاربری"
              >
                {p.username}
                <span className="text-[10px] opacity-70">✏️</span>
              </button>
              {vipActive && (
                <span className="rounded-lg bg-gradient-to-l from-[#f5c542] to-[#c9971f] px-2 py-1 font-bold text-[#1a1206]">
                  👑 VIP
                </span>
              )}
              <span className="rounded-lg bg-[#f5c542]/15 px-2 py-1 text-[#f5c542]">
                سطح {fa(p.level)}
              </span>
            </div>
          </div>

          {/* نوار XP */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>XP</span>
              <span>
                {fa(Math.floor(data.xp.current))} / {fa(data.xp.needed)}
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[#0a0e1a]">
              <div
                className="h-full bg-gradient-to-l from-[#f5c542] to-[#c9971f]"
                style={{
                  width: `${Math.min(100, (data.xp.current / data.xp.needed) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {resources.map(([e, key, val]) => (
              <div
                key={key}
                className="card flex flex-col items-center rounded-lg py-1.5"
                title={fa(val)}
              >
                <span className="text-sm">{e}</span>
                <span className="text-[11px] font-bold text-slate-200">
                  {faShort(val)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-slate-400">
            <span>⚡ قدرت: <b className="text-[#f5c542]">{fa(p.power)}</b></span>
            <span>📦 ظرفیت: {faShort(data.capacity)}</span>
          </div>

          {/* اسلایدر تب‌ها — کشیدن چپ/راست و لمس برای ورود */}
          <div
            ref={tabBarRef}
            className="ew-tabslider mt-2 flex gap-2 overflow-x-auto pb-1"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                data-tab={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3.5 py-1.5 text-[10px] transition ${
                  tab === t.id
                    ? "btn-gold"
                    : "card text-slate-300 hover:text-slate-100"
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* محتوای تب */}
      <main className="mx-auto max-w-3xl px-3 py-4">
        {tab === "home" && <HomeTab {...props} setTab={setTab} />}
        {tab === "city" && <CityTab {...props} />}
        {tab === "troops" && <TroopsTab {...props} />}
        {tab === "research" && <ResearchTab {...props} />}
        {tab === "attack" && <AttackTab {...props} />}
        {tab === "market" && <MarketTab {...props} />}
        {tab === "clan" && <ClanTab {...props} />}
        {tab === "rank" && <RankTab {...props} />}
        {tab === "shop" && <ShopTab {...props} />}
        {tab === "more" && <MoreTab {...props} />}
      </main>

      {/* مودال نام کاربری */}
      {showName && (
        <NameModal
          initial={p.username}
          isOnboarding={!p.nameChosen}
          onClose={() => setShowName(false)}
          onSaved={setPlayer}
          notify={notify}
        />
      )}

      {/* پیشنهاد نصب روی موبایل (PWA) */}
      <InstallPrompt />

      {/* توست */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg ${
            toast.ok
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export interface TabProps {
  data: MeData;
  setPlayer: (p: Player) => void;
  refresh: () => Promise<void>;
  notify: (msg: string, ok?: boolean) => void;
  nowMs: number;
}
