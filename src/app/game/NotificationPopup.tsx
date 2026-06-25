"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  icon: string;
}

export default function NotificationPopup() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // هر 30 ثانیه
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  }

  async function markAsRead(id: number) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (currentIndex >= notifications.length - 1) {
        setCurrentIndex(0);
      }
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  }

  if (notifications.length === 0) return null;

  const current = notifications[currentIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-300">
      <div className="card-gold w-full max-w-md rounded-3xl p-6 animate-in zoom-in-95 duration-300">
        <div className="mb-4 text-center text-5xl">{current.icon}</div>
        <h3 className="mb-3 text-center text-xl font-black text-[#f5c542]">
          {current.title}
        </h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-slate-200">
          {current.message}
        </p>
        <button
          onClick={() => markAsRead(current.id)}
          className="btn-gold w-full rounded-xl py-3 text-sm font-bold"
        >
          متوجه شدم ✓
        </button>
        {notifications.length > 1 && (
          <div className="mt-3 text-center text-xs text-slate-400">
            {currentIndex + 1} از {notifications.length} پیام
          </div>
        )}
      </div>
    </div>
  );
}
