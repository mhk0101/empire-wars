// ===== ردیابی جلسات ورود/خروج کاربر =====

import { db } from "@/db";
import { players, loginSessions } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// اگر کاربر بیش از این مدت فعال نباشد، جلسه‌اش «خارج‌شده» محسوب می‌شود
const SESSION_TIMEOUT_MIN = 5; // ۵ دقیقه

// Throttle: آپدیت جلسه فقط هر ۶۰ ثانیه برای هر کاربر (نه با هر رفرش ۳۰ ثانیه‌ای)
const SESSION_UPDATE_INTERVAL = 60_000; // ۶۰ ثانیه
const lastUpdateByPlayer = new Map<number, number>();

// ثبت یا ادامه‌ی جلسه‌ی کاربر هنگام ورود به بازی
// - اگر جلسه‌ی فعلی (کمتر از ۵ دقیقه) دارد → فقط lastSeenAt را به‌روز کن
// - در غیر این صورت → یک جلسه‌ی جدید بساز و loginCount را افزایش بده
export async function trackSession(
  playerId: number,
  username: string,
  ip: string
) {
  // Throttle: اگر کمتر از ۶۰ ثانیه از آخرین آپدیت گذشته، فقط lastSeenAt سبک کن
  const now = Date.now();
  const lastUpdate = lastUpdateByPlayer.get(playerId);
  if (lastUpdate && now - lastUpdate < SESSION_UPDATE_INTERVAL) {
    // آپدیت سبک: فقط last_seen_at را در جدول players به‌روز کن (۱ کوئری)
    await db
      .update(players)
      .set({ lastSeenAt: new Date() })
      .where(eq(players.id, playerId));
    return;
  }
  lastUpdateByPlayer.set(playerId, now);

  // آیا کاربر جلسه‌ی فعالی دارد؟ (آخرین فعالیت کمتر از ۵ دقیقه پیش)
  // با استفاده از now() در SQL برای دقت کامل (بدون مشکل timezone/bindng)
  const activeSessions = await db
    .select({ id: loginSessions.id })
    .from(loginSessions)
    .where(
      and(
        eq(loginSessions.playerId, playerId),
        eq(loginSessions.active, true),
        sql`${loginSessions.lastSeenAt} > now() - interval '${sql.raw(String(SESSION_TIMEOUT_MIN))} minutes'`
      )
    )
    .orderBy(desc(loginSessions.loginAt))
    .limit(1);

  if (activeSessions.length > 0) {
    // جلسه‌ی فعال دارد → فقط آخرین فعالیت را به‌روز کن
    await db
      .update(loginSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(loginSessions.id, activeSessions[0].id));

    // lastSeenAt بازیکن را هم به‌روز کن
    await db
      .update(players)
      .set({ lastSeenAt: new Date(), lastIp: ip })
      .where(eq(players.id, playerId));
    return;
  }

  // جلسه‌ی فعالی ندارد → جلسه‌های قدیمی را غیرفعال کن
  await db
    .update(loginSessions)
    .set({ active: false })
    .where(
      and(
        eq(loginSessions.playerId, playerId),
        eq(loginSessions.active, true),
        sql`${loginSessions.lastSeenAt} <= now() - interval '${sql.raw(String(SESSION_TIMEOUT_MIN))} minutes'`
      )
    );

  // جلسه‌ی جدید بساز
  await db.insert(loginSessions).values({
    playerId,
    username,
    ip: ip || "unknown",
    loginAt: new Date(),
    lastSeenAt: new Date(),
    active: true,
  });

  // افزایش تعداد ورود و به‌روزرسانی زمان آخرین ورود
  await db
    .update(players)
    .set({
      loginCount: sql`${players.loginCount} + 1`,
      lastLoginAt: new Date(),
      lastSeenAt: new Date(),
      lastIp: ip,
    })
    .where(eq(players.id, playerId));
}

// علامت‌گذاری جلسه‌های منقضی‌شده به‌عنوان غیرفعال (خروج ضمنی)
export async function cleanupStaleSessions() {
  await db
    .update(loginSessions)
    .set({ active: false })
    .where(
      and(
        eq(loginSessions.active, true),
        sql`${loginSessions.lastSeenAt} <= now() - interval '${sql.raw(String(SESSION_TIMEOUT_MIN))} minutes'`
      )
    );
}
