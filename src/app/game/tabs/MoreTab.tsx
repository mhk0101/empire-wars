"use client";

import { useEffect, useState } from "react";
import { DAILY_REWARDS, INVITE_MILESTONES } from "@/game/config";
import { fa, getJSON, post } from "@/game/client";
import type { TabProps } from "../GameApp";

interface Achievement {
  id: string;
  title: string;
  target: number;
  value: number;
  done: boolean;
  claimed: boolean;
  reward: { gems?: number };
}
interface WorldEvent {
  id: number;
  title: string;
  description: string;
  endsAt: string | null;
}

interface Mission {
  id: string;
  title: string;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
  reward: { gold?: number; gems?: number };
}

function eventRemaining(endsAt: string | null, nowMs: number): string {
  if (!endsAt) return "";
  const remain = new Date(endsAt).getTime() - nowMs;
  if (remain <= 0) return "به‌زودی پایان می‌یابد";
  const days = Math.floor(remain / 86_400_000);
  const hours = Math.floor((remain % 86_400_000) / 3_600_000);
  const mins = Math.floor((remain % 3_600_000) / 60_000);
  if (days > 0) return `${days.toLocaleString("fa-IR")} روز و ${hours.toLocaleString("fa-IR")} ساعت باقی مانده`;
  if (hours > 0) return `${hours.toLocaleString("fa-IR")} ساعت و ${mins.toLocaleString("fa-IR")} دقیقه باقی مانده`;
  return `${mins.toLocaleString("fa-IR")} دقیقه باقی مانده`;
}

export default function MoreTab({ data, setPlayer, notify, nowMs }: TabProps) {
  const p = data.player;
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [daily, setDaily] = useState<Mission[]>([]);
  const [weekly, setWeekly] = useState<Mission[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function loadMissions() {
    getJSON("/api/missions").then((d) => {
      setDaily(d.daily || []);
      setWeekly(d.weekly || []);
    });
  }

  useEffect(() => {
    getJSON("/api/mission").then((d) => setAchievements(d.achievements));
    getJSON("/api/events").then((d) => setEvents(d.events));
    loadMissions();
  }, []);

  async function claimMissionReward(id: string) {
    setBusy(id);
    try {
      const res = await post("/api/missions", { missionId: id });
      setPlayer(res.player);
      const r = res.reward;
      notify(
        `جایزه گرفته شد! ${r.gold ? `+${fa(r.gold)}💰 ` : ""}${r.gems ? `+${fa(r.gems)}💎` : ""}`
      );
      loadMissions();
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  const claimedToday =
    p.lastDailyClaim &&
    new Date(p.lastDailyClaim).toDateString() === new Date().toDateString();

  async function claimDaily() {
    setBusy("daily");
    try {
      const res = await post("/api/daily", {});
      setPlayer(res.player);
      const r = res.reward;
      notify(
        `پاداش روز ${fa(res.day)}: ${r.gold ? `${fa(r.gold)} طلا` : `${fa(r.gems)} جم`}! 🎁`
      );
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  async function claimAch(id: string) {
    setBusy(id);
    try {
      const res = await post("/api/mission", { achievementId: id });
      setPlayer(res.player);
      notify(`دستاورد دریافت شد! +${fa(res.reward.gems)} 💎`);
      const d = await getJSON("/api/mission");
      setAchievements(d.achievements);
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  async function applyInvite() {
    setBusy("invite");
    try {
      const res = await post("/api/invite", { code: inviteCode });
      setPlayer(res.player);
      notify(`دعوت ${res.inviter} ثبت شد! +۳۰۰ طلا +۱۰ جم 🎉`);
      setInviteCode("");
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  const streakDay = claimedToday ? ((p.dailyStreak % 7) + 1) : (p.dailyStreak || 1);

  return (
    <div className="space-y-6">
      {/* پاداش روزانه */}
      <section>
        <h2 className="mb-2 text-lg font-black">🎁 ورود روزانه</h2>
        <div className="card rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {DAILY_REWARDS.map((r) => {
              const reached = p.dailyStreak >= r.day && (!claimedToday || p.dailyStreak >= r.day);
              const isNext = !claimedToday && r.day === streakDay;
              return (
                <div
                  key={r.day}
                  className={`rounded-lg p-1.5 text-center text-[10px] ${
                    isNext
                      ? "bg-[#f5c542]/25 border border-[#f5c542]"
                      : reached
                        ? "bg-emerald-900/30"
                        : "bg-[#1a2440]"
                  }`}
                >
                  <div className="text-slate-400">روز {fa(r.day)}</div>
                  <div className="font-bold">
                    {r.gems ? `${fa(r.gems)}💎` : `${fa(r.gold)}💰`}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            disabled={!!claimedToday || busy === "daily"}
            onClick={claimDaily}
            className="btn-gold mt-3 w-full rounded-xl py-2 text-sm"
          >
            {claimedToday ? "✅ امروز دریافت شد" : "دریافت پاداش امروز"}
          </button>
        </div>
      </section>

      {/* مأموریت‌های روزانه */}
      <section>
        <h2 className="mb-2 text-lg font-black">📋 مأموریت‌های روزانه</h2>
        <div className="space-y-2">
          {daily.map((m) => (
            <MissionRow
              key={m.id}
              m={m}
              busy={busy === m.id}
              onClaim={() => claimMissionReward(m.id)}
            />
          ))}
        </div>
      </section>

      {/* مأموریت‌های هفتگی */}
      <section>
        <h2 className="mb-2 text-lg font-black">🗓️ مأموریت‌های هفتگی</h2>
        <div className="space-y-2">
          {weekly.map((m) => (
            <MissionRow
              key={m.id}
              m={m}
              busy={busy === m.id}
              onClaim={() => claimMissionReward(m.id)}
            />
          ))}
        </div>
      </section>

      {/* دستاوردها */}
      <section>
        <h2 className="mb-2 text-lg font-black">🏅 دستاوردها</h2>
        <div className="space-y-2">
          {achievements.map((a) => (
            <div key={a.id} className="card rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{a.title}</span>
                <span className="text-xs text-[#f5c542]">
                  +{fa(a.reward.gems ?? 0)}💎
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0a0e1a]">
                <div
                  className="h-full bg-[#f5c542]"
                  style={{
                    width: `${Math.min(100, (a.value / a.target) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {fa(Math.min(a.value, a.target))}/{fa(a.target)}
                </span>
                {a.claimed ? (
                  <span className="text-emerald-400">✅ دریافت شد</span>
                ) : a.done ? (
                  <button
                    disabled={busy === a.id}
                    onClick={() => claimAch(a.id)}
                    className="btn-gold rounded px-3 py-0.5 text-[10px]"
                  >
                    دریافت
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* دعوت دوستان */}
      <section>
        <h2 className="mb-2 text-lg font-black">🤝 دعوت دوستان</h2>
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-slate-400">کد دعوت تو:</p>
          <div className="mt-1 flex items-center justify-between rounded-lg bg-[#0a0e1a] px-3 py-2">
            <span className="font-mono text-lg font-bold text-[#f5c542]">
              {p.inviteCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(p.inviteCode);
                notify("کد کپی شد!");
              }}
              className="text-xs text-slate-300"
            >
              📋 کپی
            </button>
          </div>
          <p className="mt-2 text-[11px] text-emerald-400">
            هر دعوت موفق: +۵۰۰ طلا و +۲۰ جم برای تو (سقف: ۲ دعوت در روز). تاکنون{" "}
            {fa(p.inviteCount)} دعوت.
          </p>

          {/* پاداش‌های پلکانی دعوت */}
          <div className="mt-3 space-y-1.5">
            {INVITE_MILESTONES.map((m) => {
              const reached = p.inviteCount >= m.count;
              return (
                <div
                  key={m.count}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-[11px] ${
                    reached
                      ? "bg-emerald-900/30 text-emerald-300"
                      : "bg-[#0a0e1a] text-slate-400"
                  }`}
                >
                  <span>{m.label}</span>
                  <span>{reached ? "✅" : `${fa(p.inviteCount)}/${fa(m.count)}`}</span>
                </div>
              );
            })}
          </div>

          {!p.invitedBy && (
            <div className="mt-3 flex gap-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="کد دعوت دوستت"
                className="flex-1 rounded-xl border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm"
              />
              <button
                disabled={busy === "invite"}
                onClick={applyInvite}
                className="btn-gold rounded-xl px-4 text-sm"
              >
                ثبت
              </button>
            </div>
          )}
        </div>
      </section>

      {/* رویدادهای ویژه */}
      <section>
        <h2 className="mb-2 text-lg font-black">🌍 رویدادهای ویژه</h2>
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="card-gold card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-[#f5c542]">{e.title}</div>
                {e.endsAt && (
                  <span className="rounded-lg bg-[#0a0e1a] px-2 py-1 text-[10px] text-sky-300">
                    ⏳ {eventRemaining(e.endsAt, nowMs)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-300">{e.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* فصل */}
      <section>
        <h2 className="mb-2 text-lg font-black">📅 فصل جاری</h2>
        <div className="card rounded-2xl p-4 text-center">
          <div className="text-3xl">🏆</div>
          <p className="mt-2 text-sm font-bold">فصل ۱ — نبرد فرماندهان</p>
          <p className="mt-1 text-xs text-slate-400">
            هر ۳۰ روز فصل جدید با جوایز جم، اسکین و عنوان ویژه آغاز می‌شود.
          </p>
        </div>
      </section>
    </div>
  );
}

function MissionRow({
  m,
  busy,
  onClaim,
}: {
  m: Mission;
  busy: boolean;
  onClaim: () => void;
}) {
  const pct = Math.min(100, (m.progress / m.target) * 100);
  return (
    <div className="card rounded-xl p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{m.title}</span>
        <span className="text-[11px] text-[#f5c542]">
          {m.reward.gold ? `${fa(m.reward.gold)}💰` : ""}
          {m.reward.gems ? ` ${fa(m.reward.gems)}💎` : ""}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0a0e1a]">
        <div
          className="h-full bg-[#f5c542]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>
          {fa(Math.min(m.progress, m.target))} / {fa(m.target)}
        </span>
        {m.claimed ? (
          <span className="text-emerald-400">✅ دریافت شد</span>
        ) : m.done ? (
          <button
            disabled={busy}
            onClick={onClaim}
            className="btn-gold rounded px-3 py-0.5 text-[10px]"
          >
            دریافت جایزه
          </button>
        ) : (
          <span className="text-slate-500">در حال انجام…</span>
        )}
      </div>
    </div>
  );
}
