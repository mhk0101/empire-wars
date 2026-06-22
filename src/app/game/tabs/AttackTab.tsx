"use client";

import { useEffect, useState } from "react";
import { RESOURCE_INFO } from "@/game/config";
import { fa, faShort, getJSON, post } from "@/game/client";
import type { TabProps } from "../GameApp";

interface Target {
  id: number;
  username: string;
  level: number;
  power: number;
  gold: number;
  shieldUntil: string | null;
}

interface Report {
  id: number;
  attackerId: number;
  defenderId: number;
  attackerName: string;
  defenderName: string;
  win: boolean;
  loot: Record<string, number>;
  details: string;
  createdAt: string;
}

export default function AttackTab({ data, setPlayer, notify }: TabProps) {
  const p = data.player;
  const [targets, setTargets] = useState<Target[]>([]);
  const [now, setNow] = useState(Date.now());
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [view, setView] = useState<"targets" | "reports">("targets");
  const [result, setResult] = useState<{
    win: boolean;
    loot: Record<string, number>;
    details: string;
  } | null>(null);

  async function loadTargets() {
    const d = await getJSON("/api/targets");
    setTargets(d.targets);
    setNow(new Date(d.now).getTime());
  }
  async function loadReports() {
    const d = await getJSON("/api/reports");
    setReports(d.reports);
  }

  useEffect(() => {
    loadTargets();
    loadReports();
  }, []);

  const myTroops = Object.entries(p.troops).reduce(
    (s, [, n]) => s + (n as number),
    0
  );

  async function attack(t: Target) {
    setBusy(t.id);
    setResult(null);
    try {
      const res = await post("/api/attack", { targetId: t.id });
      setPlayer(res.player);
      setResult({ win: res.win, loot: res.loot, details: res.details });
      notify(res.win ? "پیروزی! 🏆" : "شکست خوردی 💀", res.win);
      loadTargets();
      loadReports();
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-black">🎯 میدان نبرد</h2>
      <p className="mb-3 text-xs text-slate-400">
        نیروی کل تو: <b className="text-[#f5c542]">{fa(myTroops)}</b> سرباز. به
        دشمنان حمله کن و غنیمت بگیر.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setView("targets")}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
            view === "targets" ? "btn-gold" : "card text-slate-300"
          }`}
        >
          🎯 اهداف
        </button>
        <button
          onClick={() => {
            setView("reports");
            loadReports();
          }}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
            view === "reports" ? "btn-gold" : "card text-slate-300"
          }`}
        >
          📜 گزارش‌ها
        </button>
        <button
          onClick={() => setView("rules" as any)}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
            (view as any) === "rules" ? "btn-gold" : "card text-slate-300"
          }`}
        >
          ⚖️ قوانین
        </button>
      </div>

      {/* قوانین و شرایط حمله */}
      {(view as any) === "rules" && (
        <div className="card mb-6 animate-in fade-in slide-in-from-top-2 rounded-2xl p-5 text-sm leading-relaxed text-slate-300">
          <h3 className="mb-3 font-bold text-[#f5c542]">📜 قوانین و شرایط نبرد</h3>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <b className="text-slate-100">غارت منابع:</b> در صورت پیروزی، شما <span className="text-emerald-400">۲۵٪</span> از طلا، غذا و سنگ حریف را به غنیمت می‌برید.
            </li>
            <li>
              <b className="text-slate-100">تلفات نبرد:</b> در هر حمله (پیروزی یا شکست)، بخشی از نیروهای هر دو طرف کشته می‌شوند. تلفات مدافع در صورت شکست بسیار سنگین‌تر است.
            </li>
            <li>
              <b className="text-slate-100">سپر دفاعی:</b> بازیکنی که به او حمله شده، به مدت <span className="text-sky-400">۶ ساعت</span> تحت سپر دفاعی قرار می‌گیرد و نمی‌توان دوباره به او حمله کرد.
            </li>
            <li>
              <b className="text-slate-100">شانس پیروزی:</b> شانس برد بر اساس قدرت ارتش شما در برابر قدرت دفاعی حریف (شامل نیروهای مدافع، دیوار و تحقیقات دفاعی او) محاسبه می‌شود.
            </li>
            <li>
              <b className="text-slate-100">پاداش تجربه:</b> با هر حمله موفق XP دریافت می‌کنید که باعث ارتقای سطح فرماندهی شما می‌شود.
            </li>
          </ul>
        </div>
      )}

      {/* نتیجه آخرین حمله */}
      {result && (
        <div
          className={`mb-4 rounded-2xl p-4 ${
            result.win
              ? "bg-emerald-900/40 border border-emerald-500/40"
              : "bg-rose-900/40 border border-rose-500/40"
          }`}
        >
          <div className="text-lg font-black">
            {result.win ? "🏆 پیروزی!" : "💀 شکست"}
          </div>
          <p className="mt-1 text-xs text-slate-300">{result.details}</p>
          {result.win && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(result.loot).map(([r, a]) =>
                a > 0 ? (
                  <span
                    key={r}
                    className="rounded-lg bg-black/30 px-2 py-1 text-xs text-emerald-300"
                  >
                    +{fa(a)} {RESOURCE_INFO[r]?.emoji}
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>
      )}

      {view === "targets" && (
        <div className="space-y-3">
          <button
            onClick={loadTargets}
            className="card w-full rounded-xl py-2 text-xs text-slate-300"
          >
            🔄 یافتن اهداف جدید
          </button>
          {targets.map((t) => {
            const shielded = t.shieldUntil && new Date(t.shieldUntil).getTime() > now;
            // شانس پیروزی بر اساس قدرت ارتش من در برابر قدرت هدف
            const ratio = t.power > 0 ? data.army / t.power : 2;
            const chance =
              ratio >= 1.3
                ? { label: "🟢 آسان", color: "text-emerald-400" }
                : ratio >= 0.8
                  ? { label: "🟡 متوسط", color: "text-amber-400" }
                  : { label: "🔴 سخت", color: "text-rose-400" };
            return (
              <div key={t.id} className="card rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{t.username}</div>
                    <div className="text-[11px] text-slate-400">
                      سطح {fa(t.level)} • قدرت {fa(t.power)}
                    </div>
                    <div className="text-[11px] text-amber-300">
                      💰 خزانه: {faShort(Math.floor(t.gold))}
                    </div>
                    {myTroops > 0 && (
                      <div className={`text-[11px] font-bold ${chance.color}`}>
                        شانس پیروزی: {chance.label}
                      </div>
                    )}
                  </div>
                  <button
                    disabled={busy === t.id || !!shielded || myTroops === 0}
                    onClick={() => attack(t)}
                    className="btn-gold rounded-xl px-5 py-2 text-sm"
                  >
                    {shielded
                      ? "🛡️ سپر"
                      : busy === t.id
                        ? "…"
                        : myTroops === 0
                          ? "بدون نیرو"
                          : "حمله ⚔️"}
                  </button>
                </div>
              </div>
            );
          })}
          {targets.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              هدفی یافت نشد. بعداً دوباره امتحان کن.
            </p>
          )}
        </div>
      )}

      {view === "reports" && (
        <div className="space-y-2">
          {reports.map((r) => {
            const iAttacked = r.attackerId === p.id;
            const good = iAttacked ? r.win : !r.win;
            return (
              <div
                key={r.id}
                className={`card rounded-xl p-3 text-xs ${
                  good ? "border-emerald-500/20" : "border-rose-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {iAttacked
                      ? `حمله تو به ${r.defenderName}`
                      : `${r.attackerName} به تو حمله کرد`}
                  </span>
                  <span className={good ? "text-emerald-400" : "text-rose-400"}>
                    {good ? "✅" : "❌"}
                  </span>
                </div>
                <p className="mt-1 text-slate-400">{r.details}</p>
                {Object.entries(r.loot).some(([, a]) => a > 0) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(r.loot).map(([res, a]) =>
                      a > 0 ? (
                        <span key={res} className="text-amber-300">
                          {RESOURCE_INFO[res]?.emoji}
                          {fa(a)}
                        </span>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {reports.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              هنوز نبردی ثبت نشده است.
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-slate-600">
        پس از هر حمله، مدافع ۴ ساعت سپر دفاعی می‌گیرد.
      </p>
    </div>
  );
}
