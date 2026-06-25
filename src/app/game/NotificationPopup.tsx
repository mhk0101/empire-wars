"use client";

import { useEffect, useState } from "react";
import { getJSON, post } from "@/game/client";

interface Notification {
  id: number;
  title: string;
  message: string;
  icon: string;
}

// پاپ‌آپ پیام‌های اختصاصی ادمین برای این کاربر
export default function NotificationPopup() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchNotifications() {
      try {
        const data = await getJSON("/api/notifications");
        if (active && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      } catch {
        // بی‌صدا نادیده بگیر
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // هر ۳۰ ثانیه
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function markAsRead(id: number) {
    // حذف فوری از UI برای واکنش سریع
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await post("/api/notifications", { id });
    } catch {
      // بی‌صدا نادیده بگیر
    }
  }

  if (notifications.length === 0) return null;

  const current = notifications[0];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card-gold card glow w-full max-w-md rounded-3xl p-6 text-center">
        <div className="mb-4 text-5xl">{current.icon || "📨"}</div>
        <h3 className="mb-3 text-xl font-black text-[#f5c542]">
          {current.title}
        </h3>
        <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
          {current.message}
        </p>
        <button
          onClick={() => markAsRead(current.id)}
          className="btn-gold w-full rounded-xl py-3 text-sm font-bold"
        >
          متوجه شدم ✓
        </button>
        {notifications.length > 1 && (
          <div className="mt-3 text-xs text-slate-400">
            ۱ از {notifications.length.toLocaleString("fa-IR")} پیام خوانده‌نشده
          </div>
        )}
      </div>
    </div>
  );
}
