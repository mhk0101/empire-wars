"use client";

import { useEffect, useRef, useState } from "react";
import { fa, getJSON, post } from "@/game/client";
import type { TabProps } from "../GameApp";

interface Clan {
  id: number;
  name: string;
  tag: string;
  description: string;
  power: number;
  memberCount: number;
  warWins: number;
  leaderId: number;
  level?: number;
  xp?: number;
  treasuryGold?: number;
  warPoints?: number;
}
interface Member {
  id: number;
  username: string;
  power: number;
  level: number;
  clanRole: string;
}
interface Msg {
  id: number;
  username: string;
  message: string;
  playerId: number;
}

export default function ClanTab({ data, setPlayer, notify }: TabProps) {
  const p = data.player;
  const [allClans, setAllClans] = useState<Clan[]>([]);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [form, setForm] = useState({ name: "", tag: "", description: "" });
  const [busy, setBusy] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  async function load() {
    const d = await getJSON("/api/clan");
    setAllClans(d.allClans);
    setMyClan(d.myClan);
    setMembers(d.members);
    setMessages(d.messages);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (myClan) {
      const t = setInterval(async () => {
        const d = await getJSON("/api/clan");
        setMessages(d.messages);
      }, 5000);
      return () => clearInterval(t);
    }
  }, [myClan]);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  async function act(action: string, extra: object = {}) {
    setBusy(true);
    try {
      const res = await post("/api/clan", { action, ...extra });
      if (res.player) setPlayer(res.player);
      await load();
      return res;
    } catch (e) {
      notify((e as Error).message, false);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    await post("/api/clan", { action: "chat", message: msg }).catch(() => {});
    const d = await getJSON("/api/clan");
    setMessages(d.messages);
  }

  // عضو کلن
  if (myClan) {
    return (
      <div>
        <div className="card-gold card mb-4 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-black gold-text">
                [{myClan.tag}] {myClan.name}
              </div>
              <div className="text-xs text-slate-400">
                سطح {fa(myClan.level ?? 1)} • {fa(myClan.memberCount)}/۵۰ عضو •
                قدرت {fa(myClan.power)}
              </div>
              <div className="mt-0.5 text-[11px] text-amber-300">
                🏦 صندوق: {fa(myClan.treasuryGold ?? 0)} طلا • 🏆{" "}
                {fa(myClan.warWins)} برد
              </div>
            </div>
            <button
              disabled={busy}
              onClick={() => act("leave")}
              className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300"
            >
              ترک
            </button>
          </div>
          {myClan.description && (
            <p className="mt-2 text-xs text-slate-300">{myClan.description}</p>
          )}
          {/* نوار تجربه کلن */}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] text-slate-400">
              <span>تجربه کلن</span>
              <span>
                {fa((myClan.xp ?? 0) % 1000)} / ۱٬۰۰۰
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#0a0e1a]">
              <div
                className="h-full bg-gradient-to-l from-[#f5c542] to-[#c9971f]"
                style={{ width: `${((myClan.xp ?? 0) % 1000) / 10}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card mb-4 rounded-2xl p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f5c542]">
            ⚔️ جنگ کلن (هفتگی)
          </h3>
          <div className="mb-2 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-[#0a0e1a] py-2">
              <div className="text-[10px] text-slate-400">امتیاز کلن</div>
              <div className="font-black text-[#f5c542]">
                {fa(myClan.warPoints ?? 0)}
              </div>
            </div>
            <div className="rounded-lg bg-[#0a0e1a] py-2">
              <div className="text-[10px] text-slate-400">قدرت کل</div>
              <div className="font-black text-[#f5c542]">
                {fa(myClan.power)}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            با کمک به کلن، امتیاز و تجربه کلن بالا می‌رود. جوایز: جم، آیتم کمیاب و
            رتبه بالاتر.
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              const r = await act("help");
              if (r)
                notify("۱۰۰۰ طلا به صندوق کلن کمک شد! +۲۰۰ قدرت +۱۰۰ تجربه 💪");
            }}
            className="btn-gold mt-3 w-full rounded-xl py-2 text-xs"
          >
            🤝 کمک به کلن (۱۰۰۰ 💰)
          </button>
        </div>

        {/* اعضا */}
        <h3 className="mb-2 text-sm font-bold">👥 اعضا</h3>
        <div className="mb-4 space-y-1.5">
          {members.map((m) => {
            const isLeader = m.id === myClan.leaderId;
            const isOfficer = m.clanRole === "officer";
            const iAmLeader = myClan.leaderId === p.id;
            return (
              <div
                key={m.id}
                className="card flex items-center justify-between rounded-lg px-3 py-2 text-xs"
              >
                <span>
                  {isLeader ? "👑 " : isOfficer ? "🎖️ " : ""}
                  {m.username}
                  {m.id === p.id && " (شما)"}
                  {isLeader && (
                    <span className="mr-1 text-[9px] text-[#f5c542]">رهبر</span>
                  )}
                  {!isLeader && isOfficer && (
                    <span className="mr-1 text-[9px] text-sky-400">معاون</span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-slate-400">
                  سطح {fa(m.level)} • ⚡{fa(m.power)}
                  {iAmLeader && !isLeader && (
                    <button
                      disabled={busy}
                      onClick={async () => {
                        const r = await act("promote", { memberId: m.id });
                        if (r) notify(isOfficer ? "معاونی لغو شد." : "معاون شد! 🎖️");
                      }}
                      className="rounded bg-[#1a2440] px-2 py-0.5 text-[9px] text-sky-300"
                    >
                      {isOfficer ? "لغو معاون" : "معاون کن"}
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* چت */}
        <h3 className="mb-2 text-sm font-bold">💬 چت کلن</h3>
        <div
          ref={chatRef}
          className="card mb-2 h-56 space-y-2 overflow-y-auto rounded-2xl p-3"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.playerId === p.id ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs ${
                  m.playerId === p.id
                    ? "bg-[#f5c542]/20 text-slate-100"
                    : "bg-[#1a2440] text-slate-200"
                }`}
              >
                <div className="text-[10px] text-[#f5c542]">{m.username}</div>
                {m.message}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">
              اولین پیام را بفرست!
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="پیام…"
            className="flex-1 rounded-xl border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm"
          />
          <button onClick={sendChat} className="btn-gold rounded-xl px-4 text-sm">
            ارسال
          </button>
        </div>
      </div>
    );
  }

  // بدون کلن
  return (
    <div>
      <h2 className="mb-1 text-xl font-black">🛡️ کلن‌ها</h2>
      <p className="mb-4 text-xs text-slate-400">
        به یک کلن بپیوند یا کلن خودت را بساز (۱۰۰ 💎). تا ۵۰ عضو، چت داخلی و جنگ
        کلن.
      </p>

      <div className="card mb-5 rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-bold text-[#f5c542]">ساخت کلن جدید</h3>
        <div className="space-y-2 text-xs">
          <input
            placeholder="نام کلن"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2"
          />
          <input
            placeholder="تگ (۲ تا ۸ حرف)"
            value={form.tag}
            onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2"
          />
          <input
            placeholder="توضیحات (اختیاری)"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2"
          />
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            const r = await act("create", form);
            if (r) notify("کلن ساخته شد! 🎉");
          }}
          className="btn-gold mt-3 w-full rounded-xl py-2 text-sm"
        >
          ساخت کلن (۱۰۰ 💎)
        </button>
      </div>

      <h3 className="mb-2 text-sm font-bold">کلن‌های موجود</h3>
      <div className="space-y-2">
        {allClans.map((c) => (
          <div key={c.id} className="card flex items-center justify-between rounded-xl p-3">
            <div className="text-xs">
              <div className="font-bold text-slate-100">
                [{c.tag}] {c.name}
              </div>
              <div className="text-slate-400">
                {fa(c.memberCount)}/۵۰ • قدرت {fa(c.power)}
              </div>
            </div>
            <button
              disabled={busy || c.memberCount >= 50}
              onClick={async () => {
                const r = await act("join", { clanId: c.id });
                if (r) notify("به کلن پیوستی! 🛡️");
              }}
              className="btn-gold rounded-lg px-4 py-1.5 text-xs"
            >
              {c.memberCount >= 50 ? "پر" : "پیوستن"}
            </button>
          </div>
        ))}
        {allClans.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            هیچ کلنی نیست. اولین کلن را بساز!
          </p>
        )}
      </div>
    </div>
  );
}
