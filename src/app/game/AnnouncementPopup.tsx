"use client";

import { useEffect, useState } from "react";
import { getJSON, post } from "@/game/client";

interface Notification {
  id: number;
  title: string;
  message: string;
  dismissible: boolean;
  createdAt: string;
}

export default function AnnouncementPopup() {
  const [items, setItems] = useState<Notification[]>([]);
  const [current, setCurrent] = useState<Notification | null>(null);

  useEffect(() => {
    getJSON("/api/notifications").then((d) => {
      const list = d.notifications || [];
      setItems(list);
      if (list.length > 0) setCurrent(list[0]);
    });
  }, []);

  function dismiss(id: number) {
    post("/api/notifications", { id }).catch(() => {});
    const remaining = items.filter((i) => i.id !== id);
    setItems(remaining);
    setCurrent(remaining[0] ?? null);
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div className="card-gold card w-full max-w-sm rounded-2xl p-5 text-center">
        <div className="mb-2 text-4xl">📢</div>
        <h3 className="mb-2 text-lg font-bold text-[#f5c542]">{current.title}</h3>
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
          {current.message}
        </p>
        <div className="flex items-center justify-center gap-3">
          {current.dismissible && (
            <button
              onClick={() => dismiss(current.id)}
              className="rounded-xl bg-[#1a2440] px-5 py-2 text-sm text-slate-200 transition hover:bg-[#22305a]"
            >
              بستن
            </button>
          )}
          {!current.dismissible && (
            <button
              onClick={() => dismiss(current.id)}
              className="btn-gold rounded-xl px-5 py-2 text-sm"
            >
              متوجه شدم
            </button>
          )}
        </div>
        {items.length > 1 && (
          <p className="mt-3 text-[10px] text-slate-400">
            {items.length} پیام باقی مانده
          </p>
        )}
      </div>
    </div>
  );
}
