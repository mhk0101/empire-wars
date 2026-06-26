"use client";

import { useState } from "react";
import {
  BUILDINGS,
  PRODUCTION,
  buildingUpgradeCost,
  buildingTimeSeconds,
  warehouseCapacity,
  RESOURCE_INFO,
  formatDuration,
  type BuildingKey,
} from "@/game/config";
import { fa, post, countdown } from "@/game/client";
import type { TabProps } from "../GameApp";

// چیدمان ساختمان‌ها روی نقشه با موقعیت دقیق درصدی (x = چپ‌به‌راست، y = بالا‌به‌پایین)
// مرتب در یک شبکه ایزومتریک ۳ ردیفه تا هیچ ساختمانی روی هم نیفتد
const LAYOUT: { key: BuildingKey; x: number; y: number }[] = [
  // ردیف بالا
  { key: "lab", x: 26, y: 20 },
  { key: "command", x: 50, y: 16 },
  { key: "market", x: 74, y: 20 },
  // ردیف میانی
  { key: "stonemine", x: 16, y: 44 },
  { key: "goldmine", x: 38, y: 42 },
  { key: "farm", x: 62, y: 42 },
  { key: "ironworks", x: 84, y: 44 },
  // ردیف پایین
  { key: "warehouse", x: 30, y: 68 },
  { key: "barracks", x: 54, y: 68 },
  { key: "wall", x: 76, y: 70 },
];

function isoPos(x: number, y: number) {
  return { left: `${x}%`, top: `${y}%` };
}

export default function CityTab({
  data,
  setPlayer,
  notify,
  refresh,
  nowMs,
}: TabProps) {
  const p = data.player;
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<BuildingKey | null>(null);
  const [fx, setFx] = useState<string | null>(null);

  // چرخه شب و روز (بر اساس ثانیه فعلی)
  const getTimeOfDay = () => {
    const mins = (nowMs / 60000) % 20; // کل چرخه ۲۰ دقیقه
    if (mins < 5) return "morning";
    if (mins < 10) return "noon";
    if (mins < 15) return "evening";
    return "night";
  };
  const tod = getTimeOfDay();

  const builds = data.queues.builds;
  const buildByKey = new Map(builds.map((b) => [b.building, b]));
  const queueFull = builds.length >= 2;
  const econMult = 1 + (p.research.economy ?? 0) * 0.1;
  const claimReady =
    !p.lastDailyClaim ||
    new Date(p.lastDailyClaim).toDateString() !==
      new Date(nowMs).toDateString();

  async function upgrade(key: BuildingKey) {
    setBusy(true);
    try {
      const res = await post("/api/building", { key });
      setPlayer(res.player);
      await refresh();
      setSelected(null);
      setFx(`${BUILDINGS[key].emoji} ${BUILDINGS[key].name} در حال ساخت!`);
      setTimeout(() => setFx(null), 1600);
      notify(`${BUILDINGS[key].name} به صف ساخت اضافه شد! ⏳`);
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(false);
    }
  }

  async function speedUp(type: 'build' | 'train', id: number) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await post("/api/speedup", { type, id });
      setPlayer(res.player);
      await refresh();
      notify(res.message || "زمان با موفقیت به پایان رسید! ✨");
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* عنوان و سطح شهر */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">
          <span className="flag">🚩</span> شهر {p.username}
        </h2>
        <span className="rounded-lg bg-[#f5c542]/15 px-2 py-1 text-[11px] font-bold text-[#f5c542]">
          سطح شهر {fa(p.buildings.command ?? 1)}
        </span>
      </div>

      {/* نقشه ایزومتریک */}
      <div className="city-ground glow relative mb-4 h-[58vh] min-h-[360px] w-full overflow-hidden rounded-3xl border border-[#f5c542]/15">
        {/* کاشی‌های زمین */}
        {LAYOUT.map(({ key, x, y }) => {
          const pos = isoPos(x, y);
          return (
            <div
              key={`tile-${key}`}
              className="iso-tile"
              style={{ left: pos.left, top: pos.top }}
            >
              <div className="iso-tile-face" />
            </div>
          );
        })}

        {/* ساختمان‌ها */}
        {LAYOUT.map(({ key, x, y }) => {
          const def = BUILDINGS[key];
          const lvl = p.buildings[key] ?? 0;
          const pos = isoPos(x, y);
          const job = buildByKey.get(key);
          const prod = PRODUCTION[key];
          const upgradable =
            lvl < def.maxLevel &&
            !job &&
            (key === "command" || lvl < (p.buildings.command ?? 1));

          return (
            <div
              key={key}
              className="iso-building"
              style={{ left: pos.left, top: pos.top }}
              onClick={() => setSelected(key)}
            >
              {/* افکت‌های محیطی */}
              {key === "ironworks" && lvl > 0 && (
                <>
                  <span className="smoke" />
                  <span className="smoke" style={{ animationDelay: "1.1s" }} />
                </>
              )}

              {/* نشان وضعیت */}
              {job ? (
                <span className="iso-badge">🔨</span>
              ) : upgradable ? (
                <span className="iso-badge">⬆️</span>
              ) : null}

              <span
                className={`iso-emoji ${key === "command" ? "iso-emoji-lg" : ""}`}
                style={{ opacity: lvl === 0 ? 0.45 : 1 }}
              >
                {key === "farm" ? (
                  <span className="sway">{def.emoji}</span>
                ) : (
                  def.emoji
                )}
              </span>
              <span
                className={`iso-label ${key === "command" ? "iso-label-lg" : ""}`}
              >
                {def.name} {lvl > 0 ? `Lv.${fa(lvl)}` : "🔒"}
              </span>

              {/* تولید در ساعت */}
              {prod && lvl > 0 && !job && (
                <span className="iso-rate">
                  +{fa(Math.floor(prod.base * lvl * econMult))}{" "}
                  {RESOURCE_INFO[prod.resource].emoji}/س
                </span>
              )}

              {/* تایمر ساخت */}
              {job && (
                <span className="iso-rate" style={{ color: "#7dd3fc" }}>
                  {countdown(job.finishAt, nowMs)}
                </span>
              )}
            </div>
          );
        })}

        {/* نشان جایزه آماده روی گوشه */}
        {claimReady && (
          <div className="absolute right-3 top-3 animate-pulse rounded-xl bg-[#f5c542]/20 px-2 py-1 text-[10px] text-[#f5c542]">
            🎁 جایزه آماده
          </div>
        )}
      </div>

      {/* راهنما */}
      <p className="mb-2 text-center text-[11px] text-slate-500">
        روی هر ساختمان بزن تا جزئیات و ارتقا را ببینی 👆
      </p>

      {/* افکت ارتقا */}
      {fx && (
        <div className="upgrade-fx text-center">
          <div className="text-4xl">✨</div>
          <div className="mt-1 rounded-xl bg-[#f5c542] px-4 py-2 text-sm font-black text-[#1a1206]">
            {fx}
          </div>
        </div>
      )}

      {/* پنجره جزئیات ساختمان */}
      {selected && (
        <BuildingModal
          bKey={selected}
          data={data}
          nowMs={nowMs}
          busy={busy}
          queueFull={queueFull}
          onClose={() => setSelected(null)}
          onUpgrade={() => upgrade(selected)}
          onSpeedUp={speedUp}
        />
      )}
    </div>
  );
}

function BuildingModal({
  bKey,
  data,
  nowMs,
  busy,
  queueFull,
  onClose,
  onUpgrade,
  onSpeedUp,
}: {
  bKey: BuildingKey;
  data: TabProps["data"];
  nowMs: number;
  busy: boolean;
  queueFull: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onSpeedUp: (type: 'build' | 'train', id: number) => void;
}) {
  const p = data.player;
  const def = BUILDINGS[bKey];
  const lvl = p.buildings[bKey] ?? 0;
  const max = lvl >= def.maxLevel;
  const cost = buildingUpgradeCost(bKey, lvl);
  const prod = PRODUCTION[bKey];
  const econMult = 1 + (p.research.economy ?? 0) * 0.1;
  const job = data.queues.builds.find((b) => b.building === bKey);
  const commandLevel = p.buildings.command ?? 1;
  const lockedByCommand = bKey !== "command" && lvl >= commandLevel;
  const canAfford = Object.entries(cost).every(
    ([r, a]) => (p[r as keyof typeof p] as number) >= (a ?? 0)
  );
  const seconds = buildingTimeSeconds(lvl, p.research.speed ?? 0);

  const curProd = prod ? Math.floor(prod.base * lvl * econMult) : 0;
  const nextProd = prod ? Math.floor(prod.base * (lvl + 1) * econMult) : 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center"
      onClick={onClose}
    >
      <div
        className="card-gold card w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#0a0e1a] text-4xl">
            {def.emoji}
          </div>
          <div className="flex-1">
            <div className="text-lg font-black text-slate-100">{def.name}</div>
            <div className="text-xs text-[#f5c542]">
              سطح فعلی {fa(lvl)}
              {!max && ` ← سطح ${fa(lvl + 1)}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#0a0e1a] px-2 py-1 text-sm text-slate-400"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-400">{def.desc}</p>

        {/* در حال ساخت */}
        {job ? (
          <div className="mt-4 space-y-2">
            <div className="rounded-2xl border border-sky-500/30 bg-sky-900/30 p-4 text-center">
              <div className="text-sm text-sky-300">🔨 در حال ساخت</div>
              <div className="font-mono text-2xl font-black text-sky-200">
                {countdown(job.finishAt, nowMs)}
              </div>
            </div>
            <button
              onClick={() => onSpeedUp('build', job.id)}
              disabled={busy}
              className="btn-gold w-full rounded-xl py-3 text-sm flex items-center justify-center gap-2"
            >
              <span>✨ پایان فوری:</span>
              <span className="font-bold">{Math.ceil(Math.max(0, (new Date(job.finishAt).getTime() - nowMs) / 60000))} 💎</span>
            </button>
          </div>
        ) : max ? (
          <div className="mt-4 rounded-2xl bg-[#f5c542]/15 py-3 text-center text-sm font-bold text-[#f5c542]">
            ⭐ به سطح حداکثر رسیده است
          </div>
        ) : (
          <>
            {/* مقایسه درآمد / ظرفیت */}
            {prod && (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#0a0e1a] p-3 text-sm">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">درآمد فعلی</div>
                  <div className="font-bold text-slate-200">
                    {fa(curProd)} {RESOURCE_INFO[prod.resource].emoji}
                  </div>
                </div>
                <span className="text-[#f5c542]">←</span>
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">درآمد بعدی</div>
                  <div className="font-bold text-emerald-400">
                    {fa(nextProd)} {RESOURCE_INFO[prod.resource].emoji}
                  </div>
                </div>
              </div>
            )}
            {bKey === "warehouse" && (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#0a0e1a] p-3 text-sm">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">ظرفیت فعلی</div>
                  <div className="font-bold text-slate-200">
                    {fa(warehouseCapacity(lvl))}
                  </div>
                </div>
                <span className="text-[#f5c542]">←</span>
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">ظرفیت بعدی</div>
                  <div className="font-bold text-emerald-400">
                    {fa(warehouseCapacity(lvl + 1))}
                  </div>
                </div>
              </div>
            )}

            {/* هزینه و زمان */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {Object.entries(cost).map(([r, a]) => {
                const has = (p[r as keyof typeof p] as number) >= (a ?? 0);
                return (
                  <span
                    key={r}
                    className={`rounded-lg px-2 py-1 text-xs ${
                      has
                        ? "bg-[#1a2440] text-slate-300"
                        : "bg-rose-900/40 text-rose-300"
                    }`}
                  >
                    {RESOURCE_INFO[r].emoji} {fa(a ?? 0)}
                  </span>
                );
              })}
              <span className="rounded-lg bg-[#1a2440] px-2 py-1 text-xs text-sky-300">
                ⏱️ {formatDuration(seconds)}
              </span>
            </div>

            <button
              disabled={busy || !canAfford || lockedByCommand || queueFull}
              onClick={onUpgrade}
              className="btn-gold mt-4 w-full rounded-xl py-3 text-sm"
            >
              {lockedByCommand
                ? "🔒 ابتدا مرکز فرماندهی را ارتقا بده"
                : queueFull
                  ? "صف ساخت پر است (۲ هم‌زمان)"
                  : busy
                    ? "در حال افزودن…"
                    : "🏗 ارتقا"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
