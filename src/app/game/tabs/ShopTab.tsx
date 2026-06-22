"use client";

import { useEffect, useState } from "react";
import { GEM_PACKS, SKINS } from "@/game/config";
import { fa, post, getJSON } from "@/game/client";
import type { TabProps } from "../GameApp";

interface PayReq {
  id: number;
  gems: number;
  amount: string;
  status: string;
  createdAt: string;
}

export default function ShopTab({ data, setPlayer, notify }: TabProps) {
  const p = data.player;
  const [busy, setBusy] = useState<string | null>(null);
  const now = Date.now();
  const vipActive = p.vipUntil && new Date(p.vipUntil).getTime() > now;
  const boosterActive =
    p.boosterUntil && new Date(p.boosterUntil).getTime() > now;
  const shieldActive = p.shieldUntil && new Date(p.shieldUntil).getTime() > now;

  // وضعیت پرداخت کارت‌به‌کارت
  const [card, setCard] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [myReqs, setMyReqs] = useState<PayReq[]>([]);
  const [payModal, setPayModal] = useState<number | null>(null); // packIndex
  const [payerName, setPayerName] = useState("");
  const [refCode, setRefCode] = useState("");

  async function loadPayments() {
    const d = await getJSON("/api/payment");
    setCard(d.card);
    setCardHolder(d.cardHolder);
    setMyReqs(d.requests || []);
  }
  useEffect(() => {
    loadPayments();
  }, []);

  async function submitPayment() {
    if (payModal === null) return;
    setBusy("pay");
    try {
      await post("/api/payment", {
        packIndex: payModal,
        payerName,
        refCode,
      });
      notify("درخواست خرید ثبت شد! پس از تأیید ادمین، الماس اضافه می‌شود. ⏳");
      setPayModal(null);
      setPayerName("");
      setRefCode("");
      await loadPayments();
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  async function act(action: string, extra: object, msg: string) {
    setBusy(action + JSON.stringify(extra));
    try {
      const res = await post("/api/shop", { action, ...extra });
      setPlayer(res.player);
      notify(msg);
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-black">💎 فروشگاه</h2>
      <p className="mb-4 text-xs text-slate-400">
        موجودی جم تو: <b className="text-[#f5c542]">{fa(p.gems)} 💎</b>
      </p>

      {/* بسته‌های جم — خرید با کارت‌به‌کارت و تأیید ادمین */}
      <h3 className="mb-2 text-sm font-bold">خرید جم 💎</h3>
      <p className="mb-2 text-[11px] text-slate-400">
        پس از واریز به کارت و ثبت اطلاعات، خرید توسط ادمین تأیید و الماس اضافه می‌شود.
      </p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {GEM_PACKS.map((pack, i) => (
          <div key={i} className="card rounded-2xl p-3 text-center">
            <div className="text-2xl">💎</div>
            <div className="font-bold text-[#f5c542]">{fa(pack.gems)}</div>
            {pack.bonus > 0 && (
              <div className="text-[10px] text-emerald-400">
                +{fa(pack.bonus)} هدیه
              </div>
            )}
            <div className="mt-1 text-[10px] text-slate-400">{pack.price}</div>
            <button
              disabled={!!busy}
              onClick={() => setPayModal(i)}
              className="btn-gold mt-2 w-full rounded-lg py-1.5 text-xs"
            >
              خرید
            </button>
          </div>
        ))}
      </div>

      {/* درخواست‌های پرداخت من */}
      {myReqs.length > 0 && (
        <div className="card mb-6 rounded-2xl p-3">
          <h4 className="mb-2 text-xs font-bold text-slate-300">
            درخواست‌های خرید من
          </h4>
          <div className="space-y-1.5">
            {myReqs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-[#0a0e1a] px-3 py-2 text-[11px]"
              >
                <span>💎 {fa(r.gems)}</span>
                <span
                  className={
                    r.status === "approved"
                      ? "text-emerald-400"
                      : r.status === "rejected"
                        ? "text-rose-400"
                        : "text-amber-400"
                  }
                >
                  {r.status === "approved"
                    ? "✅ تأیید شد"
                    : r.status === "rejected"
                      ? "❌ رد شد"
                      : "⏳ در انتظار تأیید"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* مودال پرداخت کارت‌به‌کارت */}
      {payModal !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="card-gold card w-full max-w-sm rounded-3xl p-5">
            <h3 className="text-center text-lg font-black gold-text">
              خرید {fa(GEM_PACKS[payModal].gems + GEM_PACKS[payModal].bonus)} 💎
            </h3>
            <p className="mt-2 text-center text-sm text-slate-300">
              مبلغ: <b className="text-[#f5c542]">{GEM_PACKS[payModal].price}</b>
            </p>

            <div className="mt-4 rounded-xl bg-[#0a0e1a] p-3 text-center">
              <p className="text-[11px] text-slate-400">مبلغ را به این کارت واریز کن:</p>
              <p
                dir="ltr"
                className="mt-1 select-all font-mono text-lg font-bold text-[#f5c542]"
              >
                {card}
              </p>
              <p className="mt-1 text-[11px] text-slate-300">{cardHolder}</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(card.replace(/\D/g, ""));
                  notify("شماره کارت کپی شد!");
                }}
                className="mt-1 text-[11px] text-sky-400"
              >
                📋 کپی شماره کارت
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <input
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="نام واریزکننده"
                className="w-full rounded-xl border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm"
              />
              <input
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                placeholder="کد پیگیری یا ۴ رقم آخر کارت"
                className="w-full rounded-xl border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPayModal(null)}
                className="card flex-1 rounded-xl py-2.5 text-sm text-slate-300"
              >
                انصراف
              </button>
              <button
                disabled={busy === "pay"}
                onClick={submitPayment}
                className="btn-gold flex-1 rounded-xl py-2.5 text-sm"
              >
                {busy === "pay" ? "در حال ثبت…" : "ثبت پرداخت"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP */}
      <div className="card-gold card mb-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold gold-text">👑 اشتراک VIP</h3>
            <p className="mt-1 text-[11px] text-slate-300">
              +۲۰٪ درآمد • ساخت سریع‌تر • اسکین خاص — ۳۰ روز
            </p>
            {vipActive && (
              <p className="mt-1 text-[11px] text-emerald-400">
                فعال تا{" "}
                {new Date(p.vipUntil!).toLocaleDateString("fa-IR")}
              </p>
            )}
          </div>
          <button
            disabled={!!busy}
            onClick={() => act("vip", {}, "VIP فعال شد! 👑")}
            className="btn-gold rounded-xl px-4 py-2 text-sm"
          >
            ۳۰۰ 💎
          </button>
        </div>
      </div>

      {/* بوستر */}
      <div className="card mb-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#f5c542]">⚡ بوستر تولید</h3>
            <p className="mt-1 text-[11px] text-slate-300">
              +۵۰٪ تولید همه منابع — ۲۴ ساعت
            </p>
            {boosterActive && (
              <p className="mt-1 text-[11px] text-emerald-400">فعال ✅</p>
            )}
          </div>
          <button
            disabled={!!busy}
            onClick={() => act("booster", {}, "بوستر فعال شد! ⚡")}
            className="btn-gold rounded-xl px-4 py-2 text-sm"
          >
            ۵۰ 💎
          </button>
        </div>
      </div>

      {/* سپر */}
      <div className="card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#f5c542]">🛡️ سپر دفاعی</h3>
            <p className="mt-1 text-[11px] text-slate-300">
              مصونیت از حملات — ۸ ساعت
            </p>
            {shieldActive && (
              <p className="mt-1 text-[11px] text-emerald-400">فعال ✅</p>
            )}
          </div>
          <button
            disabled={!!busy}
            onClick={() => act("shield", {}, "سپر دفاعی فعال شد! 🛡️")}
            className="btn-gold rounded-xl px-4 py-2 text-sm"
          >
            ۸۰ 💎
          </button>
        </div>
      </div>

      {/* اسکین‌ها */}
      <h3 className="mb-2 mt-6 text-sm font-bold">🎨 اسکین‌ها</h3>
      <p className="mb-2 text-[11px] text-slate-400">
        ظاهر شهر و پروفایلت را شخصی‌سازی کن.
      </p>
      {(["city", "profile"] as const).map((kind) => {
        const owned = p.ownedSkins || ["default"];
        const equipped = kind === "city" ? p.citySkin : p.profileSkin;
        return (
          <div key={kind} className="mb-3">
            <div className="mb-1 text-[11px] text-slate-300">
              {kind === "city" ? "اسکین شهر" : "اسکین پروفایل"}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SKINS.filter((s) => s.type === kind).map((s) => {
                const has = owned.includes(s.id);
                const isOn = equipped === s.id;
                return (
                  <div
                    key={s.id}
                    className={`card rounded-2xl p-2 text-center ${
                      isOn ? "card-gold" : ""
                    }`}
                  >
                    <div className="text-2xl">{s.emoji}</div>
                    <div className="text-[9px] text-slate-300">{s.name}</div>
                    {isOn ? (
                      <div className="mt-1 text-[9px] text-emerald-400">فعال ✅</div>
                    ) : has ? (
                      <button
                        disabled={!!busy}
                        onClick={() =>
                          act("equipSkin", { skinId: s.id }, "اسکین فعال شد! 🎨")
                        }
                        className="mt-1 w-full rounded bg-[#1a2440] py-0.5 text-[9px] text-sky-300"
                      >
                        انتخاب
                      </button>
                    ) : (
                      <button
                        disabled={!!busy}
                        onClick={() =>
                          act("buySkin", { skinId: s.id }, "اسکین خریداری شد! 🎨")
                        }
                        className="btn-gold mt-1 w-full rounded py-0.5 text-[9px]"
                      >
                        {fa(s.price)}💎
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
