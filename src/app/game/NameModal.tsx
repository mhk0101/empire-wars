"use client";

import { useState } from "react";
import { post, type Player } from "@/game/client";

export default function NameModal({
  initial,
  isOnboarding,
  onClose,
  onSaved,
  notify,
}: {
  initial: string;
  isOnboarding: boolean;
  onClose: () => void;
  onSaved: (p: Player) => void;
  notify: (msg: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState(isOnboarding ? "" : initial);
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  async function save() {
    if (name.trim().length < 3) {
      notify("نام باید حداقل ۳ کاراکتر باشد.", false);
      return;
    }
    setBusy(true);
    setSuggestions([]);
    try {
      const res = await post("/api/profile", { username: name });
      let finalPlayer = res.player;

      // اعمال کد دعوت (اختیاری) — فقط هنگام اولین ورود
      if (isOnboarding && invite.trim().length >= 4) {
        try {
          const inv = await post("/api/invite", { code: invite.trim() });
          finalPlayer = inv.player;
          notify(`کد دعوت ${inv.inviter} ثبت شد! 🎉`);
        } catch (e) {
          notify("نام ذخیره شد، اما " + (e as Error).message, false);
        }
      } else {
        notify("نام کاربری ذخیره شد! ✅");
      }

      onSaved(finalPlayer);
      onClose();
    } catch (e) {
      const err = e as Error & { data?: { suggestions?: string[] } };
      if (err.data?.suggestions?.length) {
        setSuggestions(err.data.suggestions);
        notify("این نام گرفته شده — یکی از پیشنهادها را انتخاب کن.", false);
      } else {
        notify(err.message, false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card-gold card w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="floaty mb-3 text-5xl">👑</div>
        <h2 className="text-xl font-black gold-text">
          {isOnboarding ? "به Empire Wars خوش آمدی!" : "تغییر نام کاربری"}
        </h2>
        <p className="mt-2 text-xs text-slate-300">
          {isOnboarding
            ? "نام فرمانده‌ات را انتخاب کن. این نام در نقشه، لیدربورد و نبردها نمایش داده می‌شود."
            : "نام جدید فرمانده‌ات را وارد کن."}
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          maxLength={24}
          placeholder="مثلاً: سردار آرش"
          autoFocus
          className="mt-5 w-full rounded-xl border border-white/15 bg-[#0a0e1a] px-4 py-3 text-center text-lg font-bold focus:border-[#f5c542] focus:outline-none"
        />

        {/* پیشنهاد نام در صورت تکراری بودن */}
        {suggestions.length > 0 && (
          <div className="mt-3 text-right">
            <p className="mb-1 text-[11px] text-amber-400">
              این نام‌ها آزادند — یکی را انتخاب کن:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setName(s);
                    setSuggestions([]);
                  }}
                  className="rounded-lg bg-[#1a2440] px-2.5 py-1 text-xs text-[#f5c542] transition hover:bg-[#22305a]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {isOnboarding && (
          <div className="mt-3">
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              maxLength={16}
              placeholder="کد دعوت (اختیاری)"
              className="w-full rounded-xl border border-white/10 bg-[#0a0e1a] px-4 py-2.5 text-center text-sm focus:border-[#f5c542] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              اگر کسی دعوتت کرده، کدش را وارد کن تا جایزه بگیری (اختیاری).
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {!isOnboarding && (
            <button
              onClick={onClose}
              className="card flex-1 rounded-xl py-3 text-sm text-slate-300"
            >
              انصراف
            </button>
          )}
          <button
            disabled={busy}
            onClick={save}
            className="btn-gold flex-1 rounded-xl py-3 text-sm"
          >
            {busy ? "در حال ذخیره…" : isOnboarding ? "شروع بازی 🎮" : "ذخیره"}
          </button>
        </div>
      </div>
    </div>
  );
}
