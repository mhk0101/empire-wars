"use client";

import { useState } from "react";
import { TROOPS, RESOURCE_INFO, troopTrainSeconds, formatDuration, type TroopKey } from "@/game/config";
import { fa, post, countdown } from "@/game/client";
import type { TabProps } from "../GameApp";

const ORDER: TroopKey[] = ["soldier", "archer", "knight", "warmachine"];

export default function TroopsTab({ data, setPlayer, notify, refresh, nowMs }: TabProps) {
  const p = data.player;
  const trains = data.queues.trains;
  const [qty, setQty] = useState<Record<string, string>>({
    soldier: "",
    archer: "",
    knight: "",
    warmachine: "",
  });

  const getQty = (key: string) => Math.max(0, parseInt(qty[key] || "0"));
  const [busy, setBusy] = useState<string | null>(null);

  async function speedUp(id: number) {
    if (busy) return;
    setBusy("speedup");
    try {
      const res = await post("/api/speedup", { type: "train", id });
      setPlayer(res.player);
      await refresh();
      notify(res.message || "نیروها فوراً آماده شدند! ✨");
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  async function train(key: TroopKey) {
    const amount = getQty(key);
    if (amount < 1) return;
    setBusy(key);
    try {
      const res = await post("/api/train", { key, qty: amount });
      setPlayer(res.player);
      await refresh();
      notify(`${fa(amount)} ${TROOPS[key].name} به صف آموزش اضافه شد! ⏳`);
      setQty(s => ({ ...s, [key]: "" }));
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  const barracks = p.buildings.barracks ?? 0;
  const trainQueueFull = trains.length >= 3;

  return (
    <div>
      <h2 className="mb-1 text-xl font-black">⚔️ پادگان — آموزش نیرو</h2>
      <p className="mb-4 text-xs text-slate-400">
        {barracks < 1
          ? "⚠️ ابتدا پادگان را در نقشه شهر بساز."
          : `سطح پادگان: ${fa(barracks)}. نیرو بساز تا بتوانی حمله کنی.`}
      </p>

      {/* صف آموزش فعال */}
      {trains.length > 0 && (
        <div className="card mb-4 rounded-2xl p-3">
          <h3 className="mb-2 text-sm font-bold text-sky-300">⏳ صف آموزش</h3>
          <div className="space-y-2">
            {trains.map((t) => {
              const gemCost = Math.ceil(Math.max(0, (new Date(t.finishAt).getTime() - nowMs) / 60000));
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-sky-900/20 px-3 py-2 text-xs"
                >
                  <div className="flex flex-col">
                    <span>
                      {TROOPS[t.troop as TroopKey]?.emoji}{" "}
                      {fa(t.quantity)} {TROOPS[t.troop as TroopKey]?.name}
                    </span>
                    <span className="font-mono font-bold text-sky-200">
                      {countdown(t.finishAt, nowMs)}
                    </span>
                  </div>
                  <button
                    onClick={() => speedUp(t.id)}
                    disabled={!!busy}
                    className="btn-gold rounded-lg px-3 py-1 text-[9px] flex items-center gap-1"
                  >
                    <span>✨ پایان:</span>
                    <b>{gemCost} 💎</b>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {ORDER.map((key) => {
          const def = TROOPS[key];
          const owned = p.troops[key] ?? 0;
          const qStr = qty[key];
          const qVal = getQty(key);
          const costVal = qVal || 1; // برای نمایش هزینه حتی وقتی خالی است
          const canAfford = Object.entries(def.cost).every(
            ([r, a]) => (p[r as keyof typeof p] as number) >= (a ?? 0) * costVal
          );
          const trainSecs = troopTrainSeconds(key, costVal, p.research.training ?? 0);
          return (
            <div key={key} className="card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{def.emoji}</span>
                  <div>
                    <div className="font-bold">{def.name}</div>
                    <div className="text-[11px] text-slate-400">
                      دارایی: {fa(owned)}
                    </div>
                  </div>
                </div>
                <div className="text-left text-[11px] text-slate-300">
                  <div>⚔️ حمله {fa(def.attack)}</div>
                  <div>🛡️ دفاع {fa(def.defense)}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(def.cost).map(([r, a]) => (
                  <span
                    key={r}
                    className="rounded-lg bg-[#1a2440] px-2 py-1 text-[11px] text-slate-300"
                  >
                    {RESOURCE_INFO[r].emoji} {fa((a ?? 0) * costVal)}
                  </span>
                ))}
              </div>

              <div className="mt-2 text-[11px] text-sky-400">
                ⏱️ زمان آموزش: {formatDuration(trainSecs)}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  placeholder="تعداد..."
                  value={qStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 500)) {
                      setQty(s => ({ ...s, [key]: val }));
                    }
                  }}
                  className="w-20 rounded-lg border border-white/10 bg-[#0a0e1a] px-2 py-2 text-center text-sm"
                />
                <button
                  disabled={busy === key || !canAfford || barracks < 1 || trainQueueFull || qVal < 1}
                  onClick={() => train(key)}
                  className="btn-gold flex-1 rounded-xl py-2 text-sm"
                >
                  {trainQueueFull ? "صف پر است" : busy === key ? "…" : "آموزش ⏳"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
