// ===== سیستم Rate Limiting بر اساس IP =====
// جلوگیری از ساخت بی‌نهایت اکانت و حملات flood

import { headers } from "next/headers";

// استخراج IP واقعی کاربر از هدرها (پشت پروکسی/CDN)
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    hdrs.get("cf-connecting-ip") ||
    hdrs.get("x-client-ip") ||
    "unknown"
  );
}

// ===== کش rate limit در حافظه (sliding window) =====
interface LimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, LimitEntry>();

// هر چند وقت یک‌بار کش قدیمی پاک شود (جلوگیری از نشت حافظه)
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// بررسی محدودیت نرخ برای یک کلید (مثلاً IP)
// max = حداکثر تعداد مجاز، windowMs = بازه زمانی
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // پنجره جدید
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetAt,
  };
}

// محدودیت ساخت اکانت جدید بر اساس IP
// حداکثر ۳ اکانت در هر ساعت + ۸ اکانت در هر روز
export async function checkAccountCreationLimit(): Promise<{
  allowed: boolean;
  reason?: string;
  retryAfterSec?: number;
}> {
  const ip = await getClientIp();
  if (ip === "unknown") {
    // اگر IP قابل تشخیص نبود، محدودیت سخت‌گیرانه‌تر
    const r = rateLimit("acct:unknown", 1, 60_000);
    if (!r.allowed) {
      return {
        allowed: false,
        reason: "تلاش‌های زیادی. بعداً دوباره تلاش کن.",
        retryAfterSec: 60,
      };
    }
    return { allowed: true };
  }

  // محدودیت ساعتی: حداکثر ۳ اکانت در ساعت
  const hourly = rateLimit(`acct:h:${ip}`, 3, 60 * 60_000);
  if (!hourly.allowed) {
    return {
      allowed: false,
      reason: "از این دستگاه/IP امروز اکانت‌های زیادی ساخته شده. یک ساعت دیگر تلاش کن.",
      retryAfterSec: Math.ceil((hourly.resetAt - Date.now()) / 1000),
    };
  }

  // محدودیت روزانه: حداکثر ۸ اکانت در ۲۴ ساعت
  const daily = rateLimit(`acct:d:${ip}`, 8, 24 * 60 * 60_000);
  if (!daily.allowed) {
    return {
      allowed: false,
      reason: "سقف ساخت اکانت از این IP پر شده. ۲۴ ساعت دیگر تلاش کن.",
      retryAfterSec: Math.ceil((daily.resetAt - Date.now()) / 1000),
    };
  }

  return { allowed: true };
}

// محدودیت کلی API (جلوگیری از flood/سرعت بالا)
// حداکثر ۶۰ درخواست در دقیقه برای هر IP
export async function checkApiFlood(): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const ip = await getClientIp();
  const r = rateLimit(`api:${ip}`, 90, 60_000); // 90 req/min
  if (!r.allowed) {
    return {
      allowed: false,
      reason: "درخواست‌های زیادی در زمان کوتاه. چند ثانیه صبر کن.",
    };
  }
  return { allowed: true };
}
