"use client";

import { useEffect, useState } from "react";
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

const LAYOUT: { key: BuildingKey; x: number; y: number }[] = [
  { key: "lab", x: 26, y: 20 },
  { key: "command", x: 50, y: 16 },
  { key: "market", x: 74, y: 20 },
  { key: "stonemine", x: 16, y: 44 },
  { key: "goldmine", x: 38, y: 42 },
  { key: "farm", x: 62, y: 42 },
  { key: "ironworks", x: 84, y: 44 },
  { key: "warehouse", x: 30, y: 68 },
  { key: "barracks", x: 54, y: 68 },
  { key: "wall", x: 76, y: 70 },
];

function isoPos(x: number, y: number) {
  return { left: `${x}%`, top: `${y}%` };
}

export default function CityTab({ data, setPlayer, notify, refresh, nowMs }: TabProps) {
  const p = data.player;
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<BuildingKey | null>(null);
  const [fx, setFx] = useState<string | null>(null);
  const [timeOfDay, setTod] = useState("noon"); // morning | noon | evening | night

  const builds = data.queues.builds;
  const buildByKey = new Map(builds.map((b) => [b.building, b]));
  const econMult = 1 + (p.research.economy ?? 0) * 0.1;
  const vipActive = !!p.vipUntil && new Date(p.vipUntil).getTime() > nowMs;
  const maxQueue = vipActive ? 2 : 1;

  // چرخه شب و روز هر ۵ دقیقه
  useEffect(() => {
    const cycle = ["morning", "noon", "evening", "night"];
    let idx = cycle.indexOf(timeOfDay);
    const t = setInterval(() => {
      idx = (idx + 1) % cycle.length;
      setTod(cycle[idx]);
    }, 300_000);
    return () => clearInterval(t);
  }, [timeOfDay]);

  async function upgrade(key: BuildingKey) {
    setBusy(true);
    try {
      const res = await post("/api/building", { key });
      setPlayer(res.player);
      await refresh();
      setSelected(null);
      setFx(`${BUILDINGS[key].emoji} ${BUILDINGS[key].name} در حال ارتقا...`);
      setTimeout(() => setFx(null), 2000);
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(false);
    }
  }

  async function speedUp(type: "building", id: any) {
    try {
      const res = await post("/api/speedup", { type, id });
      setPlayer(res.player);
      await refresh();
      notify("با موفقیت تکمیل شد! ⚡");
    } catch (e) {
      notify((e as Error).message, false);
    }
  }

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-lg font-black gold-text">🏰 قلمرو من</h2>
        <span className="rounded-lg bg-[#f5c542]/10 px-2 py-1 text-[10px] font-bold text-[#f5c542]">
          {p.level >= 30 ? "👑 امپراتوری بزرگ" : p.level >= 20 ? "🏰 قلعه" : p.level >= 10 ? "🏙️ شهر" : "🏘️ دهکده"} (Lv.{fa(p.level)})
        </span>
      </div>

      <div className={`city-ground glow relative mb-4 h-[60vh] min-h-[400px] w-full overflow-hidden rounded-3xl border border-[#f5c542]/20 tod-${timeOfDay}`}>
        <div className={`city-sky tod-${timeOfDay}`} />
        
        {/* جاده‌ها */}
        <svg className="absolute inset-0 z-0 h-full w-full pointer-events-none opacity-30">
          {LAYOUT.map(l => l.key !== 'command' && (
            <line key={`road-${l.key}`} x1="50%" y1="16%" x2={`${l.x}%`} y2={`${l.y}%`} stroke="#f5c542" strokeWidth="1" strokeDasharray="4" />
          ))}
        </svg>

        {/* عناصر محیطی */}
        <div className="decor" style={{ left: '15%', top: '25%' }}>🌳</div>
        <div className="decor" style={{ left: '80%', top: '35%' }}>🌲</div>
        <div className="decor" style={{ left: '25%', top: '85%' }}>🪨</div>
        <div className="soldier">🏃‍♂️</div>

        {/* ساختمان‌ها */}
        {LAYOUT.map(({ key, x, y }) => {
          const def = BUILDINGS[key];
          const lvl = p.buildings[key] ?? 0;
          const pos = isoPos(x, y);
          const job = buildByKey.get(key);
          const isCommand = key === "command";
          const canUp = lvl < def.maxLevel && !job && (isCommand || lvl < (p.buildings.command ?? 1));

          return (
            <div
              key={key}
              className={`iso-building ${isCommand ? "command-glow" : ""}`}
              style={{ 
                left: pos.left, 
                top: pos.top, 
                zIndex: Math.floor(y),
                transform: `translate(-50%, -70%) scale(${isCommand ? 1.3 : 1})` 
              }}
              onClick={() => setSelected(key)}
            >
              {canUp && <div className="upgrade-halo" />}
              {job && <span className="iso-badge ring-glow">🔨</span>}
              
              <span className={`iso-emoji ${key === "farm" ? "sway" : ""}`} style={{ opacity: lvl === 0 ? 0.5 : 1 }}>
                {def.emoji}
              </span>
              <span className="iso-label">
                {def.name} {lvl > 0 ? `Lv.${fa(lvl)}` : "🔒"}
              </span>

              {job && (
                <div className="iso-rate bg-sky-900/80 text-sky-200 border border-sky-400/50">
                  {countdown(job.finishAt, nowMs)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {fx && <div className="upgrade-fx font-black gold-text text-xl">{fx}</div>}

      {selected && (
        <BuildingModal
          bKey={selected}
          data={data}
          nowMs={nowMs}
          busy={busy}
          maxQueue={maxQueue}
          onClose={() => setSelected(null)}
          onUpgrade={() => upgrade(selected)}
          onSpeedUp={(id: any) => speedUp("building", id)}
        />
      )}
    </div>
  );
}

function BuildingModal({ bKey, data, nowMs, busy, maxQueue, onClose, onUpgrade, onSpeedUp }: any) {
  const p = data.player;
  const def = BUILDINGS[bKey as BuildingKey];
  const lvl = p.buildings[bKey] ?? 0;
  const job = data.queues.builds.find((b: any) => b.building === bKey);
  const cost = buildingUpgradeCost(bKey as BuildingKey, lvl);
  const canAfford = Object.entries(cost).every(([r, a]) => (p[r as keyof typeof p] as number) >= (a ?? 0));
  
  // محاسبه هزینه سرعت‌دهی
  const remainMs = job ? new Date(job.finishAt).getTime() - nowMs : 0;
  const speedUpGems = Math.max(1, Math.ceil(remainMs / 60_000));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="card-gold card w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <div className="text-5xl">{def.emoji}</div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-100">{def.name}</h3>
            <p className="text-xs text-[#f5c542]">سطح {fa(lvl)} {lvl < def.maxLevel && `← ${fa(lvl+1)}`}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-500">✕</button>
        </div>
        
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">{def.desc}</p>

        {job ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-sky-900/20 border border-sky-500/30 p-4 text-center">
              <div className="text-xs text-sky-300 mb-1">در حال ارتقا...</div>
              <div className="font-mono text-3xl font-black text-sky-100">{countdown(job.finishAt, nowMs)}</div>
            </div>
            <button onClick={() => onSpeedUp(job.id)} className="btn-gold w-full rounded-2xl py-3 font-bold flex items-center justify-center gap-2">
              ⚡ تکمیل فوری با {fa(speedUpGems)} جم
            </button>
          </div>
        ) : lvl >= def.maxLevel ? (
          <div className="mt-6 rounded-2xl bg-emerald-900/20 border border-emerald-500/30 p-4 text-center text-emerald-400 font-bold">
            ساختمان به سطح حداکثر رسیده است
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(cost).map(([r, a]) => (
                <div key={r} className={`rounded-xl p-2 flex items-center justify-between text-xs ${ (p[r as keyof typeof p] as number) >= (a ?? 0) ? 'bg-slate-800' : 'bg-rose-900/20 text-rose-300' }`}>
                  <span>{RESOURCE_INFO[r].emoji} {RESOURCE_INFO[r].name}</span>
                  <span className="font-bold">{fa(a as number)}</span>
                </div>
              ))}
            </div>
            <button
              disabled={busy || !canAfford || data.queues.builds.length >= maxQueue}
              onClick={onUpgrade}
              className="btn-gold w-full rounded-2xl py-4 text-lg font-black glow"
            >
              {data.queues.builds.length >= maxQueue ? "صف ساخت پر است" : "🏗️ شروع ارتقا"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
