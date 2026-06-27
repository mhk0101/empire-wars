import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { ensureSchema } from "@/db/init";
import { players } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import { collectResources } from "./logic";
import { computePower } from "./config";
import {
  checkAccountCreationLimit,
  getClientIp,
  checkNamePattern,
  clearNamePattern,
} from "./rateLimit";

const TOKEN_COOKIE = "ew_token";
const PID_COOKIE = "ew_pid";

// تضمین می‌کند که جدول‌های دیتابیس و ستون‌ها وجود دارند پیش از هر کوئری.
// این تابع فقط یک‌بار در هر پردازش اجرا می‌شود (کش داخلی دارد).
async function ensureReady() {
  try {
    await ensureSchema();
  } catch {
    // حتی اگر شکست خورد، ادامه بده تا خطای اصلی گزارش شود
  }
}

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

// مقادیر پیش‌فرض ساختمان‌ها، نیروها و تحقیقات
// (به‌صورت صریح در INSERT تنظیم می‌شوند تا مطمئن باشیم همیشه درست اعمال می‌شوند)
const DEFAULT_BUILDINGS = {
  command: 1,
  goldmine: 1,
  farm: 1,
  stonemine: 1,
  ironworks: 1,
  warehouse: 1,
  barracks: 1,
  lab: 1,
  market: 1,
  wall: 0,
};
const DEFAULT_TROOPS = { soldier: 0, archer: 0, knight: 0, warmachine: 0 };
const DEFAULT_RESEARCH = {
  economy: 0,
  speed: 0,
  defense: 0,
  attack: 0,
  training: 0,
};

// دریافت بازیکن بر اساس توکن دستگاه پایدار
// اولویت: هدر x-ew-token (از localStorage، قابل اعتماد در وب‌ویو تلگرام) سپس کوکی
export async function getOrCreatePlayer() {
  await ensureReady();
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
  // بررسی محدودیت ساخت اکانت بر اساس IP (ضد اسپم)
  const creationLimit = await checkAccountCreationLimit();
  if (!creationLimit.allowed) {
    // ⚡ بلاک خودکار اسپمر: اگر سیستم تشخیص داد سریع اکانت می‌سازد
    if (creationLimit.shouldAutoBan && creationLimit.banIp) {
      try {
        await db
          .update(players)
          .set({ banned: true })
          .where(
            or(
              eq(players.signUpIp, creationLimit.banIp),
              eq(players.lastIp, creationLimit.banIp)
            )
          );
        clearNamePattern(creationLimit.banIp);
        console.warn(`🚫 AUTO-BAN: IP ${creationLimit.banIp} blocked for spam (fast account creation)`);
      } catch {
        // بی‌صدا
      }
    }
    const err = new Error(creationLimit.reason || "محدودیت ساخت اکانت") as Error & {
      rateLimited?: boolean;
      retryAfterSec?: number;
    };
    err.rateLimited = true;
    err.retryAfterSec = creationLimit.retryAfterSec;
    throw err;
  }

  // ثبت IP محل ساخت اکانت
  const ip = await getClientIp();

  // 🚫 اگر این IP قبلاً بلاک شده، اجازه ساخت اکانت جدید نده
  if (ip && ip !== "unknown") {
    const bannedByIp = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.banned, true), or(eq(players.signUpIp, ip), eq(players.lastIp, ip))))
      .limit(1);
    if (bannedByIp.length) {
      const err = new Error("این دستگاه/IP به دلیل تخلف مسدود شده است.") as Error & {
        rateLimited?: boolean;
      };
      err.rateLimited = true;
      throw err;
    }
  }

  const username = `${NAMES[Math.floor(Math.random() * NAMES.length)]}_${Math.floor(
    Math.random() * 99999
  )}`;

  // ⚡ تشخیص اسپم با نام تکراری: اگر از این IP چندین نام مشابه ساخته شده
  const nameSpam = checkNamePattern(ip, username);
  if (nameSpam) {
    // بلاک خودکار این IP
    try {
      await db
        .update(players)
        .set({ banned: true })
        .where(
          or(
            eq(players.signUpIp, ip),
            eq(players.lastIp, ip)
          )
        );
      clearNamePattern(ip);
      console.warn(`🚫 AUTO-BAN: IP ${ip} blocked for spam (duplicate name pattern: ${username})`);
    } catch {
      // بی‌صدا
    }
    const err = new Error(
      "🚫 سیستم شما را به‌عنوان اسپمر تشخیص داد و بلاک کرد (ساخت اکانت با نام تکراری)."
    ) as Error & { rateLimited?: boolean };
    err.rateLimited = true;
    throw err;
  }

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
          buildings: { ...DEFAULT_BUILDINGS },
          troops: { ...DEFAULT_TROOPS },
          research: { ...DEFAULT_RESEARCH },
          // سپر ۲۴ ساعته برای بازیکنان جدید
          shieldUntil: new Date(Date.now() + 24 * 3600_000),
          // ثبت IP محل ساخت اکانت برای امنیت
          signUpIp: ip,
          lastIp: ip,
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

// مقادیر پیش‌فرض را با یک آبجکت ناقص ادغام کن تا کلیدهای گمشده پر شوند
function mergeDefaults<T extends Record<string, number>>(
  obj: Record<string, number> | null | undefined,
  defaults: Record<string, number>
): T {
  return { ...defaults, ...(obj || {}) } as T;
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

  // ترمیم خودکار: اگر ساختمان‌ها/نیروها/تحقیقات خالی یا ناقص هستند، مقادیر پیش‌فرض را پر کن
  const buildings = mergeDefaults(p.buildings, DEFAULT_BUILDINGS);
  const troops = mergeDefaults(p.troops, DEFAULT_TROOPS);
  const research = mergeDefaults(p.research, DEFAULT_RESEARCH);

  const now = new Date();
  const { gold, food, stone, iron, gained } = collectResources(
    { ...p, buildings, research },
    now
  );
  const power = computePower(buildings, troops, research);

  const updated = await db
    .update(players)
    .set({
      gold,
      food,
      stone,
      iron,
      lastCollect: now,
      power,
      buildings,
      troops,
      research,
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
  await ensureReady();
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
          buildings: { ...DEFAULT_BUILDINGS },
          troops: { ...DEFAULT_TROOPS },
          research: { ...DEFAULT_RESEARCH },
        })
        .returning();
      return inserted[0];
    } catch {
      if (attempt === 4) throw new Error("failed to create player");
    }
  }
  throw new Error("failed to create player");
}
