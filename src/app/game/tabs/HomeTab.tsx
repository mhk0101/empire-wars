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
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [event, setEvent] = useState<{
    title: string;
    endsAt: string | null;
  } | null>(null);
  useEffect(() => {
    getJSON("/api/activity").then((d) => setActivities(d.items || []));
    getJSON("/api/events").then((d) => setEvent(d.events?.[0] ?? null));
  }, [data.player.power, data.queues.builds.length, data.queues.trains.length]);

  const p = data.player;
  const now = nowMs;
  const vipActive = !!p.vipUntil && new Date(p.vipUntil).getTime() > now;
  const boosterActive =
    !!p.boosterUntil && new Date(p.boosterUntil).getTime() > now;
  const shieldActive =
    !!p.shieldUntil && new Date(p.shieldUntil).getTime() > now;

  const claimedToday =
    p.lastDailyClaim &&
    new Date(p.lastDailyClaim).toDateString() === new Date(now).toDateString();

  const totalTroops = Object.values(p.troops).reduce(
    (s, n) => s + (n as number),
    0
  );

  const profileEmoji =
    SKINS.find((s) => s.id === p.profileSkin)?.emoji ?? "👑";

  const resources: { key: string; val: number }[] = [
    { key: "gold", val: Math.floor(p.gold) },
    { key: "food", val: Math.floor(p.food) },
    { key: "stone", val: Math.floor(p.stone) },
    { key: "iron", val: Math.floor(p.iron) },
  ];

  // هشدارها
  const alerts: { icon: string; text: string; tab?: string }[] = [];
  if (!claimedToday)
    alerts.push({ icon: "🎁", text: "جایزه روزانه آماده دریافت است!", tab: "more" });
  for (const b of data.queues.builds) {
    const done = new Date(b.finishAt).getTime() <= now;
    alerts.push({
      icon: done ? "✅" : "🏗️",
      text: done
        ? "ارتقای ساختمان تمام شد!"
        : `ارتقای ساختمان: ${countdown(b.finishAt, now)}`,
      tab: "city",
    });
  }
  for (const t of data.queues.trains) {
    const done = new Date(t.finishAt).getTime() <= now;
    alerts.push({
      icon: done ? "✅" : "⚔️",
      text: done
        ? "نیروها آماده شدند!"
        : `آموزش ${TROOPS[t.troop as TroopKey]?.name}: ${countdown(t.finishAt, now)}`,
      tab: "troops",
    });
  }

  const xpPct = Math.min(100, (data.xp.current / data.xp.needed) * 100);

  return (
    <div className="space-y-4">
      {/* کارت بازیکن */}
      <div className="card-gold card glow rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f5c542] to-[#c9971f] text-2xl">
              {profileEmoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-100">{p.username}</span>
                {vipActive && (
                  <span className="rounded bg-gradient-to-l from-[#f5c542] to-[#c9971f] px-1.5 py-0.5 text-[9px] font-bold text-[#1a1206]">
                    VIP
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                سطح {fa(p.level)} • رتبه #{fa(data.rank)}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-[10px] text-slate-400">قدرت کل</div>
            <div className="text-lg font-black text-[#f5c542]">{fa(p.power)}</div>
          </div>
        </div>

        {/* نوار XP */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] text-slate-400">
            <span>تجربه (XP)</span>
            <span>
              {fa(Math.floor(data.xp.current))} / {fa(data.xp.needed)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#0a0e1a]">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#fbe089] to-[#c9971f] transition-all"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* بخش اقدامات فوری (Action Card) */}
      <div className="card-gold card glow border-emerald-500/30 bg-emerald-950/20 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-emerald-400 mb-2">⚡ اقدام فوری</h3>
        {(() => {
          if (!claimedToday) {
            return (
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-100">🎁 جایزه روزانه آماده دریافت است!</div>
                <button onClick={() => setTab("more")} className="btn-gold rounded-lg px-4 py-1.5 text-[10px]">دریافت</button>
              </div>
            );
          }
          const finishedBuild = data.queues.builds.find(b => new Date(b.finishAt).getTime() <= now);
          if (finishedBuild) {
            return (
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-100">🏗️ ساخت ساختمان به پایان رسید.</div>
                <button onClick={() => setTab("city")} className="btn-gold rounded-lg px-4 py-1.5 text-[10px]">تکمیل</button>
              </div>
            );
          }
          const finishedTrain = data.queues.trains.find(t => new Date(t.finishAt).getTime() <= now);
          if (finishedTrain) {
            return (
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-100">⚔️ نیروهای جدید آماده نبرد هستند.</div>
                <button onClick={() => setTab("troops")} className="btn-gold rounded-lg px-4 py-1.5 text-[10px]">مشاهده</button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300 italic">فعلاً تمام کارها در جریان است...</div>
              <button onClick={() => setTab("city")} className="card px-3 py-1.5 rounded-lg text-[10px] text-slate-300">مدیریت شهر</button>
            </div>
          );
        })()}
      </div>

      {/* دکمه‌های سریع */}
      <div className="grid grid-cols-4 gap-2">
        <QuickBtn
          icon="🎁"
          label="جایزه"
          glow={!claimedToday}
          onClick={() => setTab("more")}
        />
        <QuickBtn icon="⚔️" label="حمله" onClick={() => setTab("attack")} />
        <QuickBtn icon="📜" label="مأموریت" onClick={() => setTab("more")} />
        <QuickBtn icon="🎯" label="رویداد" onClick={() => setTab("more")} />
      </div>

      {/* رویداد فعال */}
      {event && (
        <button
          onClick={() => setTab("more")}
          className="card-gold card glow flex w-full items-center justify-between rounded-2xl p-3 text-right"
        >
          <div>
            <div className="text-sm font-bold text-[#f5c542]">{event.title}</div>
            {event.endsAt && (
              <div className="text-[10px] text-sky-300">
                ⏳ {eventCountdown(event.endsAt, now)}
              </div>
            )}
          </div>
          <span className="text-[#f5c542]">›</span>
        </button>
      )}

      {/* منابع با تولید و ظرفیت */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-200">💼 منابع</h3>
        <div className="grid grid-cols-2 gap-2">
          {resources.map(({ key, val }) => {
            const rate = data.rates[key] ?? 0;
            const cap = data.capacity;
            const pct = Math.min(100, (val / cap) * 100);
            const full = val >= cap;
            return (
              <div key={key} className="card rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm">
                    {RESOURCE_INFO[key].emoji}
                    <span className="text-slate-300">{RESOURCE_INFO[key].name}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    +{fa(rate)}/س
                  </span>
                </div>
                <div className="mt-1 text-base font-black text-slate-100">
                  {fa(val)}
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#0a0e1a]">
                  <div
                    className={`h-full ${full ? "bg-rose-500" : "bg-sky-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[9px] text-slate-500">
                  ظرفیت: {faShort(cap)}
                  {full && " — پر شد!"}
                </div>
              </div>
            );
          })}
        </div>
        {/* جم جدا */}
        <div className="card mt-2 flex items-center justify-between rounded-2xl p-3">
          <span className="flex items-center gap-1.5 text-sm">
            💎 <span className="text-slate-300">جم</span>
          </span>
          <span className="text-base font-black text-[#f5c542]">
            {fa(p.gems)}
          </span>
        </div>
      </div>

      {/* هشدارها */}
      {alerts.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-200">🔔 هشدارها</h3>
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <button
                key={i}
                onClick={() => a.tab && setTab(a.tab)}
                className="card flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-xs transition hover:card-gold"
              >
                <span className="text-base">{a.icon}</span>
                <span className="text-slate-300">{a.text}</span>
                <span className="mr-auto text-[#f5c542]">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* بوسترهای فعال */}
      {(vipActive || boosterActive || shieldActive) && (
        <div className="flex flex-wrap gap-2">
          {vipActive && (
            <span className="rounded-lg bg-[#f5c542]/15 px-3 py-1.5 text-[11px] text-[#f5c542]">
              👑 VIP فعال
            </span>
          )}
          {boosterActive && (
            <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] text-emerald-400">
              ⚡ بوستر تولید فعال
            </span>
          )}
          {shieldActive && (
            <span className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-[11px] text-sky-400">
              🛡️ سپر دفاعی فعال
            </span>
          )}
        </div>
      )}

      {/* آمار بازیکن */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-200">📊 وضعیت من</h3>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="رتبه جهانی" value={`#${fa(data.rank)}`} />
          <Stat label="قدرت ارتش" value={fa(data.army)} />
          <Stat label="تعداد نیرو" value={fa(totalTroops)} />
          <Stat label="پیروزی‌ها" value={fa(p.attacksWon)} accent="emerald" />
          <Stat label="شکست‌ها" value={fa(p.attacksLost)} accent="rose" />
          <Stat
            label="کلن"
            value={data.clan ? `[${data.clan.tag}]` : "—"}
          />
        </div>
      </div>

      {/* آمار زنده سرور */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-200">🌐 سرور زنده</h3>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="👥 آنلاین" value={fa(data.server.online)} accent="emerald" />
          <Stat label="🏰 شهرها" value={fa(data.server.players)} />
          <Stat label="👑 کلن‌ها" value={fa(data.server.clans)} />
        </div>
      </div>

      {/* فعالیت‌های اخیر */}
      {activities.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-200">
            📰 فعالیت‌های اخیر
          </h3>
          <div className="card max-h-56 space-y-1.5 overflow-y-auto rounded-2xl p-3">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 border-b border-white/5 pb-1.5 text-[11px] last:border-0"
              >
                <span>{a.icon}</span>
                <span className="text-slate-300">{a.text}</span>
                <span className="mr-auto text-[9px] text-slate-500">
                  {new Date(a.createdAt).toLocaleTimeString("fa-IR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* راهنمای قدم بعدی */}
      <div className="card-gold card rounded-2xl p-4 text-center">
        <p className="text-xs text-slate-300">
          💡 قدم بعدی: {nextStep(data, !!claimedToday)}
        </p>
      </div>
    </div>
  );
}

function nextStep(
  data: TabProps["data"],
  claimedToday: boolean
): string {
  if (!claimedToday) return "جایزه روزانه‌ات را بگیر! 🎁";
  if ((data.player.buildings.barracks ?? 0) < 1)
    return "پادگان بساز تا نیرو آموزش دهی. 🛡️";
  if (data.army === 0) return "در پادگان نیرو آموزش بده. ⚔️";
  if (data.queues.builds.length === 0)
    return "یک ساختمان را ارتقا بده تا قوی‌تر شوی. 🏗️";
  return "به دشمنان حمله کن و غنیمت بگیر! 🎯";
}

function QuickBtn({
  icon,
  label,
  onClick,
  glow,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  glow?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`card flex flex-col items-center gap-1 rounded-2xl py-3 transition hover:card-gold ${
        glow ? "card-gold animate-pulse" : ""
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[10px] text-slate-300">{label}</span>
    </button>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "rose";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "rose"
        ? "text-rose-400"
        : "text-[#f5c542]";
  return (
    <div className="card rounded-xl p-2.5 text-center">
      <div className="text-[9px] text-slate-400">{label}</div>
      <div className={`text-sm font-black ${color}`}>{value}</div>
    </div>
  );
}
