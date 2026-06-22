import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { collectResources } from "./logic";
import { computePower } from "./config";

const TOKEN_COOKIE = "ew_token";
const PID_COOKIE = "ew_pid";

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const NAMES = [
  "فرمانده",
  "شاهزاده",
  "سردار",
  "امیر",
  "قهرمان",
  "سلطان",
  "شوالیه",
  "خان",
];

// دریافت بازیکن بر اساس توکن دستگاه پایدار
// اولویت: هدر x-ew-token (از localStorage، قابل اعتماد در وب‌ویو تلگرام) سپس کوکی
export async function getOrCreatePlayer() {
  const store = await cookies();
  const hdrs = await headers();
  // توکن از هدر کلاینت (localStorage) یا کوکی
  const token =
    hdrs.get("x-ew-token") || store.get(TOKEN_COOKIE)?.value || "";

  // ۱) تلاش با توکن دستگاه پایدار
  if (token) {
    const byToken = await db
      .select()
      .from(players)
      .where(eq(players.deviceToken, token))
      .limit(1);
    if (byToken.length) return byToken[0];
  }

  // ۲) سازگاری با کوکی قدیمی شناسه بازیکن
  const pid = store.get(PID_COOKIE)?.value;
  if (pid) {
    const byId = await db
      .select()
      .from(players)
      .where(eq(players.id, Number(pid)))
      .limit(1);
    if (byId.length) {
      // اتصال توکن دستگاه به این بازیکن برای دفعات بعد
      if (token && !byId[0].deviceToken) {
        await db
          .update(players)
          .set({ deviceToken: token })
          .where(eq(players.id, byId[0].id));
      }
      return byId[0];
    }
  }

  // ۳) ساخت بازیکن جدید و اتصال به توکن دستگاه
  const username = `${NAMES[Math.floor(Math.random() * NAMES.length)]}_${Math.floor(
    Math.random() * 99999
  )}`;

  const effectiveToken = token || randomCode(24);
  let player;
  for (let attempt = 0; attempt < 5; attempt++) {
    // اگر همزمان توسط درخواست دیگری ساخته شده، همان را برگردان
    const existing = await db
      .select()
      .from(players)
      .where(eq(players.deviceToken, effectiveToken))
      .limit(1);
    if (existing.length) return existing[0];

    try {
      const inserted = await db
        .insert(players)
        .values({
          username,
          inviteCode: randomCode(),
          deviceToken: effectiveToken,
          // سپر ۲۴ ساعته برای بازیکنان جدید
          shieldUntil: new Date(Date.now() + 24 * 3600_000),
        })
        .returning();
      player = inserted[0];
      break;
    } catch {
      // برخورد یکتایی (کد دعوت/توکن) → حلقه دوباره تلاش می‌کند
      if (attempt === 4) {
        const again = await db
          .select()
          .from(players)
          .where(eq(players.deviceToken, effectiveToken))
          .limit(1);
        if (again.length) return again[0];
        throw new Error("failed to create player");
      }
    }
  }
  if (!player) throw new Error("failed to create player");

  // کوکی‌ها را برای سازگاری ست می‌کنیم (تلاش بهترین حالت؛ مرجع اصلی هدر است)
  try {
    store.set(PID_COOKIE, String(player.id), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    if (player.deviceToken) {
      store.set(TOKEN_COOKIE, player.deviceToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365 * 2,
        path: "/",
      });
    }
  } catch {
    // در GET handler ممکن است ست کوکی نادیده گرفته شود؛ مهم نیست چون هدر مرجع است
  }
  return player;
}

// همگام‌سازی منابع و قدرت بازیکن (بدون نیاز به آنلاین بودن)
export async function syncPlayer(playerId: number) {
  const found = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  if (!found.length) return null;
  const p = found[0];
  const now = new Date();
  const { gold, food, stone, iron, gained } = collectResources(p, now);
  const power = computePower(p.buildings, p.troops, p.research);

  const updated = await db
    .update(players)
    .set({
      gold,
      food,
      stone,
      iron,
      lastCollect: now,
      power,
      totalGoldEarned: p.totalGoldEarned + Math.max(0, gained.gold),
    })
    .where(eq(players.id, playerId))
    .returning();
  return updated[0];
}

export async function getPlayerById(id: number) {
  const found = await db
    .select()
    .from(players)
    .where(eq(players.id, id))
    .limit(1);
  return found[0] ?? null;
}

// دریافت یا ساخت بازیکن بر اساس شناسه تلگرام (برای ربات)
export async function getOrCreatePlayerByTelegram(
  telegramId: string,
  displayName: string
) {
  const existing = await db
    .select()
    .from(players)
    .where(eq(players.telegramId, telegramId))
    .limit(1);
  if (existing.length) return existing[0];

  const username =
    displayName?.trim().slice(0, 24) ||
    `${NAMES[Math.floor(Math.random() * NAMES.length)]}_${Math.floor(
      Math.random() * 99999
    )}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    // اگر همزمان ساخته شد، همان را برگردان
    const again = await db
      .select()
      .from(players)
      .where(eq(players.telegramId, telegramId))
      .limit(1);
    if (again.length) return again[0];
    try {
      const inserted = await db
        .insert(players)
        .values({
          telegramId,
          username,
          inviteCode: randomCode(),
          deviceToken: `tg_${telegramId}`,
        })
        .returning();
      return inserted[0];
    } catch {
      if (attempt === 4) throw new Error("failed to create player");
    }
  }
  throw new Error("failed to create player");
}
