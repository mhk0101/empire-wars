"use client";

import { useEffect, useState } from "react";
import { getJSON } from "@/game/client";

export default function GlobalAnnouncement() {
  const [ann, setAnn] = useState<{ id: number; message: string; icon: string } | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    getJSON("/api/admin/broadcast").then((d) => {
      if (d.announcement) {
        const dismissed = localStorage.getItem(`ew_ann_${d.announcement.id}`);
        if (!dismissed) {
          setAnn(d.announcement);
          setShow(true);
        }
      }
    });
  }, []);

  if (!show || !ann) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="card-gold card glow w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="mb-3 text-5xl">{ann.icon || "🔔"}</div>
        <h3 className="text-lg font-black gold-text">اطلاعیه جدید</h3>
        <div className="mt-4 max-h-60 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
          {ann.message}
        </div>
        <button
          onClick={() => {
            localStorage.setItem(`ew_ann_${ann.id}`, "1");
            setShow(false);
          }}
          className="btn-gold mt-6 w-full rounded-2xl py-3 text-sm"
        >
          متوجه شدم
        </button>
      </div>
    </div>
  );
}
