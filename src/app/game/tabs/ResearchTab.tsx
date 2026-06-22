"use client";

import { useState } from "react";
import {
  RESEARCH,
  researchUpgradeCost,
  RESOURCE_INFO,
  type ResearchKey,
} from "@/game/config";
import { fa, post } from "@/game/client";
import type { TabProps } from "../GameApp";

const ORDER: ResearchKey[] = ["economy", "speed", "defense", "attack", "training"];

export default function ResearchTab({ data, setPlayer, notify }: TabProps) {
  const p = data.player;
  const [busy, setBusy] = useState<string | null>(null);
  const lab = p.buildings.lab ?? 0;

  async function research(key: ResearchKey) {
    setBusy(key);
    try {
      const res = await post("/api/research", { key });
      setPlayer(res.player);
      notify(`${RESEARCH[key].name} ارتقا یافت! 🔬`);
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-black">🔬 آزمایشگاه — تحقیق و توسعه</h2>
      <p className="mb-4 text-xs text-slate-400">
        {lab < 1
          ? "⚠️ ابتدا آزمایشگاه را در نقشه شهر بساز."
          : `سطح آزمایشگاه: ${fa(lab)}. فناوری‌های دائمی برای امپراتوری‌ات باز کن.`}
      </p>

      <div className="grid gap-3">
        {ORDER.map((key) => {
          const def = RESEARCH[key];
          const lvl = p.research[key] ?? 0;
          const max = lvl >= def.maxLevel;
          const cost = researchUpgradeCost(key, lvl);
          const canAfford = Object.entries(cost).every(
            ([r, a]) => (p[r as keyof typeof p] as number) >= (a ?? 0)
          );
          return (
            <div key={key} className="card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{def.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{def.name}</div>
                  <div className="text-[11px] text-[#f5c542]">
                    سطح {fa(lvl)} / {fa(def.maxLevel)} — {def.perLevel}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{def.desc}</p>

              {!max ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(cost).map(([r, a]) =>
                      (a ?? 0) > 0 ? (
                        <span
                          key={r}
                          className="rounded-lg bg-[#1a2440] px-2 py-1 text-[11px] text-slate-300"
                        >
                          {RESOURCE_INFO[r].emoji} {fa(a ?? 0)}
                        </span>
                      ) : null
                    )}
                  </div>
                  <button
                    disabled={busy === key || !canAfford || lab < 1}
                    onClick={() => research(key)}
                    className="btn-gold mt-3 w-full rounded-xl py-2 text-sm"
                  >
                    {busy === key ? "در حال تحقیق…" : "تحقیق"}
                  </button>
                </>
              ) : (
                <div className="mt-3 rounded-xl bg-[#f5c542]/15 py-2 text-center text-sm font-bold text-[#f5c542]">
                  ⭐ کامل شد
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
