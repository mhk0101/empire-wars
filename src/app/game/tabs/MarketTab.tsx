"use client";

import { useEffect, useState } from "react";
import { RESOURCE_INFO } from "@/game/config";
import { fa, getJSON, post } from "@/game/client";
import type { TabProps } from "../GameApp";

interface Order {
  id: number;
  sellerId: number;
  sellerName: string;
  offerResource: string;
  offerAmount: number;
  wantResource: string;
  wantAmount: number;
}

const TRADABLE = ["gold", "food", "stone", "iron"];

export default function MarketTab({ data, setPlayer, notify }: TabProps) {
  const p = data.player;
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [form, setForm] = useState({
    offerResource: "food",
    offerAmount: 1000,
    wantResource: "gold",
    wantAmount: 500,
  });

  async function load() {
    const d = await getJSON("/api/market");
    setOrders(d.orders);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(-1);
    try {
      const res = await post("/api/market", { action: "create", ...form });
      setPlayer(res.player);
      notify("سفارش ثبت شد! 🏪");
      load();
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  async function buy(id: number) {
    setBusy(id);
    try {
      const res = await post("/api/market", { action: "buy", orderId: id });
      setPlayer(res.player);
      notify(`معامله انجام شد! (کارمزد ۵٪: ${fa(res.fee)})`);
      load();
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: number) {
    setBusy(id);
    try {
      const res = await post("/api/market", { action: "cancel", orderId: id });
      setPlayer(res.player);
      notify("سفارش لغو شد.");
      load();
    } catch (e) {
      notify((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-black">🏪 بازار آزاد</h2>
      <p className="mb-4 text-xs text-slate-400">
        منابع را با بازیکنان دیگر معامله کن. کارمزد هر معامله ۵٪ است.
      </p>

      {/* ساخت سفارش */}
      <div className="card mb-5 rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-bold text-[#f5c542]">ثبت سفارش فروش</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="mb-1 block text-slate-400">می‌فروشم</label>
            <select
              value={form.offerResource}
              onChange={(e) =>
                setForm((f) => ({ ...f, offerResource: e.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-2 py-2"
            >
              {TRADABLE.map((r) => (
                <option key={r} value={r}>
                  {RESOURCE_INFO[r].emoji} {RESOURCE_INFO[r].name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-slate-400">مقدار</label>
            <input
              type="number"
              value={form.offerAmount}
              onChange={(e) =>
                setForm((f) => ({ ...f, offerAmount: Number(e.target.value) }))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-2 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-400">در ازای</label>
            <select
              value={form.wantResource}
              onChange={(e) =>
                setForm((f) => ({ ...f, wantResource: e.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-2 py-2"
            >
              {TRADABLE.map((r) => (
                <option key={r} value={r}>
                  {RESOURCE_INFO[r].emoji} {RESOURCE_INFO[r].name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-slate-400">مقدار</label>
            <input
              type="number"
              value={form.wantAmount}
              onChange={(e) =>
                setForm((f) => ({ ...f, wantAmount: Number(e.target.value) }))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-2 py-2"
            />
          </div>
        </div>
        <button
          disabled={busy === -1}
          onClick={create}
          className="btn-gold mt-3 w-full rounded-xl py-2 text-sm"
        >
          ثبت سفارش
        </button>
      </div>

      {/* لیست سفارش‌ها */}
      <h3 className="mb-2 text-sm font-bold">سفارش‌های فعال</h3>
      <div className="space-y-2">
        {orders.map((o) => {
          const mine = o.sellerId === p.id;
          return (
            <div key={o.id} className="card flex items-center justify-between rounded-xl p-3">
              <div className="text-xs">
                <div className="font-semibold text-emerald-300">
                  {RESOURCE_INFO[o.offerResource].emoji} {fa(o.offerAmount)}
                </div>
                <div className="text-slate-400">
                  ← {RESOURCE_INFO[o.wantResource].emoji} {fa(o.wantAmount)}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {o.sellerName}
                </div>
              </div>
              {mine ? (
                <button
                  disabled={busy === o.id}
                  onClick={() => cancel(o.id)}
                  className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300"
                >
                  لغو
                </button>
              ) : (
                <button
                  disabled={busy === o.id}
                  onClick={() => buy(o.id)}
                  className="btn-gold rounded-lg px-4 py-1.5 text-xs"
                >
                  خرید
                </button>
              )}
            </div>
          );
        })}
        {orders.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            سفارشی موجود نیست. اولین معامله را تو ثبت کن!
          </p>
        )}
      </div>
    </div>
  );
}
