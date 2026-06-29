import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ===== Rate Limiting سطح Edge (Middleware) =====
// جلوگیری از flood و ساخت بی‌نهایت اکانت — قبل از رسیدن به API

// کش در حافظه‌ی Edge (هر نمونه‌ی server جداگانه است)
const LIMITS = new Map<string, { count: number; resetAt: number }>();

function checkLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = LIMITS.get(key);
  if (!entry || entry.resetAt < now) {
    LIMITS.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

// پاک‌سازی دوره‌ای کش قدیمی
let lastClean = Date.now();
function maybeClean() {
  const now = Date.now();
  if (now - lastClean < 60_000) return;
  lastClean = now;
  for (const [key, entry] of LIMITS) {
    if (entry.resetAt < now) LIMITS.delete(key);
  }
}

// استخراج IP واقعی کاربر
function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  maybeClean();

  // فقط برای routeهای API اعمال کن
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getIp(request);

  // محدودیت کلی API: حداکثر ۹۰ درخواست در دقیقه برای هر IP (ضد flood)
  // نکته: محدودیت ساخت اکانت در خود session.ts اعمال می‌شود، چون آنجا می‌دانیم
  // آیا اکانت جدید ساخته می‌شود یا کاربر موجود لاگین می‌کند.
  if (!checkLimit(`api:${ip}`, 90, 60_000)) {
    return NextResponse.json(
      {
        error: "درخواست‌های زیادی در زمان کوتاه ارسال کردی. یک دقیقه صبر کن.",
        rateLimited: true,
      },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
