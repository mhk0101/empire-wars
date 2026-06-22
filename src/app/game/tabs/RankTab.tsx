"use client";

import { useEffect, useState } from "react";
import { fa, faShort, getJSON } from "@/game/client";
import type { TabProps } from "../GameApp";

const TYPES = [
  { id: "power", label: "قدرت", emoji: "⚡" },
  { id: "level", label: "سطح", emoji: "⭐" },
  { id: "wealth", label: "ثروت", emoji: "💰" },
  { id: "attacks", label: "حملات", emoji: "⚔️" },
  { id: "clan", label: "کلن", emoji: "🛡️" },
];

interface MeInfo {
  id: number;
  rank: number;
  value: number;
  gap: number | null;
}

interface Row {
  id: number;
  username?: string;
  name?: string;
  tag?: string;
  level?: number;
  power: number;
  totalGoldEarned?: number;
  attacksWon?: number;
  memberCount?: number;
}

export default function RankTab({ data }: TabProps) {
  const [type, setType] = useState("power");
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<MeInfo | null>(null);

  useEffect(() => {
    getJSON(`/api/leaderboard?type=${type}`).then((d) => {
      setRows(d.rows);
      setMe(d.me ?? null);
    });
  }, [type]);

  function valueOf(r: Row): string {
    if (type === "wealth") return `💰 ${faShort(r.totalGoldEarned ?? 0)}`;
    if (type === "attacks") return `⚔️ ${fa(r.attacksWon ?? 0)}`;
    if (type === "level") return `⭐ ${fa(r.level ?? 1)}`;
    if (type === "clan") return `⚡ ${faShort(r.power)}`;
    return `⚡ ${faShort(r.power)}`;
  }

  const gapLabel =
    type === "wealth"
      ? "ثروت"
      : type === "attacks"
        ? "پیروزی"
        : type === "level"
          ? "XP"
          : "قدرت";

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h2 className="mb-1 text-xl font-black">🏆 لیدربورد</h2>
      <p className="mb-3 text-xs text-slate-400">
        فصل هر ۳۰ روز ریست می‌شود. فرمانده برتر جوایز جم، اسکین و عنوان ویژه
        می‌گیرد.
      </p>

      <div className="mb-4 grid grid-cols-5 gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`rounded-xl py-2 text-[11px] font-semibold ${
              type === t.id ? "btn-gold" : "card text-slate-300"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* رتبه من + فاصله تا نفر بالاتر */}
      {type !== "clan" && me && (
        <div className="card-gold card mb-4 rounded-2xl p-3 text-center">
          <div className="text-xs text-slate-300">
            رتبه تو: <b className="text-[#f5c542]">#{fa(me.rank)}</b>
          </div>
          {me.gap !== null && me.gap > 0 ? (
            <div className="mt-1 text-[11px] text-emerald-400">
              فقط {fa(me.gap)} {gapLabel} تا رتبه #{fa(me.rank - 1)}! 🔥
            </div>
          ) : me.rank === 1 ? (
            <div className="mt-1 text-[11px] text-[#f5c542]">
              🥇 تو در صدر جدول هستی!
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-1.5">
        {rows.map((r, i) => {
          const isMe = type !== "clan" && r.id === data.player.id;
          return (
            <div
              key={r.id}
              className={`card flex items-center justify-between rounded-xl px-3 py-2.5 ${
                isMe ? "card-gold" : ""
              } ${i < 3 ? "border-[#f5c542]/30" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-center text-sm font-bold">
                  {i < 3 ? medals[i] : fa(i + 1)}
                </span>
                <div>
                  <div className="text-sm font-semibold">
                    {type === "clan"
                      ? `[${r.tag}] ${r.name}`
                      : r.username}
                    {isMe && " (شما)"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {type === "clan"
                      ? `${fa(r.memberCount ?? 0)} عضو`
                      : `سطح ${fa(r.level ?? 1)}`}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-[#f5c542]">
                {valueOf(r)}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            هنوز رتبه‌ای ثبت نشده.
          </p>
        )}
      </div>
    </div>
  );
}
