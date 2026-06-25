"use client";

import { useEffect, useState } from "react";
import { RESOURCE_INFO, TROOPS, SKINS, type TroopKey } from "@/game/config";
import { fa, faShort, countdown, getJSON } from "@/game/client";
import type { TabProps } from "../GameApp";

interface ActivityItem {
  id: number;
  icon: string;
  text: string;
  createdAt: string;
}

function eventCountdown(endsAt: string, nowMs: number): string {
  const remain = new Date(endsAt).getTime() - nowMs;
  if (remain <= 0) return "به‌زودی پایان می‌یابد";
  const days = Math.floor(remain / 86_400_000);
  const hours = Math.floor((remain % 86_400_000) / 3_600_000);
  if (days > 0)
    return `${days.toLocaleString("fa-IR")} روز و ${hours.toLocaleString("fa-IR")} ساعت باقی مانده`;
  const mins = Math.floor((remain % 3_600_000) / 60_000);
  return `${hours.toLocaleString("fa-IR")} ساعت و ${mins.toLocaleString("fa-IR")} دقیقه باقی مانده`;
}

export default function HomeTab({
  data,
  nowMs,
  setTab,
}: TabProps & { setTab: (t: string) => void }) {
  const p = data.player;
  const now = nowMs;
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [event, setEvent] = useState<{ title: string; endsAt: string | null } | null>(null);

  useEffect(() => {
    getJSON("/api/activity").then((d) => setActivities(d.items || []));
    getJSON("/api/events").then((d) => setEvent(d.events?.[0] ?? null));
  }, [p.power, data.queues.builds.length]);

  const vipActive = !!p.vipUntil && new Date(p.vipUntil).getTime() > now;
  const claimedToday = p.lastDailyClaim && new Date(p.lastDailyClaim).toDateString() === new Date(now).toDateString();
  const xpPct = Math.min(100, (data.xp.current / data.xp.needed) * 100);
  const profileEmoji = SKINS.find((s) => s.id === p.profileSkin)?.emoji ?? "👑";

  // --- سیستم Action Card (اولویت‌بندی اقدامات) ---
  const getAction = () => {
    if (!claimedToday) return { icon: "🎁", title: "جایزه آماده است", btn: "دریافت", tab: "more" };
    if (data.queues.builds.length === 0 && p.gold > 1000) return { icon: "🏗️", title: "ساختمان قابل ارتقا", btn: "ارتقا", tab: "city" };
    if (data.army < 10 && p.food > 500) return { icon: "⚔️", title: "نیروها کم هستند", btn: "آموزش", tab: "troops" };
    return null;
  };
  const action = getAction();

  return (
    <div className="space-y-4 pb-4">
      {/* هدر بازیکن */}
      <div className="card-gold card glow rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f5c542] to-[#c9971f] text-2xl shadow-[0_0_15px_rgba(245,197,66,0.4)]">
              {profileEmoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-100 text-lg">{p.username}</span>
                {vipActive && <span className="rounded bg-gradient-to-l from-[#f5c542] to-[#c9971f] px-2 py-0.5 text-[9px] font-black text-[#1a1206]">👑 VIP</span>}
              </div>
              <div className="text-[11px] text-slate-400">سطح {fa(p.level)} • رتبه #{fa(data.rank)}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">قدرت امپراتوری</div>
            <div className="text-xl font-black text-[#f5c542]">{fa(p.power)}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] text-slate-400">
            <span>تجربه تا سطح بعدی</span>
            <span>{fa(Math.floor(data.xp.current))} / {fa(data.xp.needed)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#0a0e1a] border border-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-[#fbe089] via-[#f5c542] to-[#c9971f] transition-all duration-1000 shadow-[0_0_10px_rgba(245,197,66,0.3)]" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* Action Card */}
      {action && (
        <div className="card-gold card glow bg-gradient-to-r from-[#1a2440] to-[#121a2e] rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">{action.icon}</span>
            <div>
              <div className="text-sm font-bold text-white">{action.title}</div>
              <div className="text-[10px] text-slate-400">همین حالا اقدام کن!</div>
            </div>
          </div>
          <button onClick={() => setTab(action.tab)} className="btn-gold px-6 py-2 rounded-xl text-xs font-black shadow-lg">
            {action.btn}
          </button>
        </div>
      )}

      {/* سرور زنده */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card rounded-2xl p-3 flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5">
           <span className="text-xl">🟢</span>
           <div>
             <div className="text-[10px] text-slate-400">بازیکنان آنلاین</div>
             <div className="text-sm font-bold text-emerald-400">{fa(data.server.online)}</div>
           </div>
        </div>
        <div className="card rounded-2xl p-3 flex items-center gap-3 border border-sky-500/20 bg-sky-500/5">
           <span className="text-xl">⚔️</span>
           <div>
             <div className="text-[10px] text-slate-400">نبردهای امروز</div>
             <div className="text-sm font-bold text-sky-400">{fa(124)}</div>
           </div>
        </div>
      </div>

      {/* رویداد فعال */}
      {event && (
        <button onClick={() => setTab("more")} className="card-gold card glow flex w-full items-center justify-between rounded-2xl p-4 bg-gradient-to-l from-[#1a2440] to-[#0a0e1a]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📢</span>
            <div className="text-right">
              <div className="text-sm font-bold text-[#f5c542]">{event.title}</div>
              {event.endsAt && <div className="text-[10px] text-sky-300">⏳ {eventCountdown(event.endsAt, now)}</div>}
            </div>
          </div>
          <span className="text-[#f5c542] text-xl">›</span>
        </button>
      )}

      {/* منابع */}
      <div className="grid grid-cols-2 gap-2">
        {["gold", "food", "stone", "iron"].map((key) => {
          const val = Math.floor(p[key as keyof typeof p] as number);
          const rate = data.rates[key] ?? 0;
          const cap = data.capacity;
          const pct = Math.min(100, (val / cap) * 100);
          return (
            <div key={key} className="card rounded-2xl p-3 border border-white/5">
              <div className="flex justify-between mb-1">
                <span className="text-lg">{RESOURCE_INFO[key].emoji}</span>
                <span className="text-[9px] text-emerald-400 font-bold">+{fa(rate)}/س</span>
              </div>
              <div className="text-lg font-black text-white">{faShort(val)}</div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
                <div className={`h-full ${val >= cap ? "bg-rose-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* فعالیت‌های اخیر */}
      {activities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 px-1">📰 آخرین رویدادها</h3>
          <div className="card rounded-2xl p-1 overflow-hidden border border-white/5">
            <div className="max-h-40 overflow-y-auto space-y-px">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2 bg-[#121a2e]/50 hover:bg-[#1a2440]/50 transition-colors">
                  <span className="text-base">{a.icon}</span>
                  <span className="text-[11px] text-slate-300 flex-1">{a.text}</span>
                  <span className="text-[9px] text-slate-500">{new Date(a.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
