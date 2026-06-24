import { ADMIN_PASSWORD } from "@/game/config";
import { db } from "@/db";
import { players } from "@/db/schema";import { sendMessage } from "@/game/telegram";
import { eq, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

function checkAuth(req: Request): boolean {
  return req.headers.get("x-admin-pass") === ADMIN_PASSWORD;
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action; // telegram | site

  // ۱. ارسال پیام همگانی به تلگرام (برای کسانی که تلگرام‌شان وصل است)
  if (action === "telegram") {
    const text = String(body.message || "").trim();
    if (!text) return Response.json({ error: "پیام خالی است." }, { status: 400 });

    const targets = await db
      .select({ telegramId: players.telegramId })
      .from(players)
      .where(isNotNull(players.telegramId));

    let count = 0;
    for (const t of targets) {
      if (t.telegramId) {
        await sendMessage(t.telegramId, text).catch(() => {});
        count++;
      }
    }
    return Response.json({ ok: true, sentCount: count });
  }

  // ۲. ثبت اطلاعیه پاپ‌آپ داخل سایت
  if (action === "site") {
    const message = String(body.message || "").trim();
    if (!message) return Response.json({ error: "پیام خالی است." }, { status: 400 });

    await db.insert(announcements).values({
      message,
      icon: body.icon || "🔔",
      active: true,
    });
    return Response.json({ ok: true });
  }

  // ۳. غیرفعال کردن اطلاعیه قدیمی
  if (action === "clear_site") {
    await db.update(announcements).set({ active: false });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "عملیات نامعتبر." }, { status: 400 });
}

// دریافت آخرین اطلاعیه فعال برای کاربر
export async function GET() {
  const row = await db
    .select()
    .from(announcements)
    .where(eq(announcements.active, true))
    .limit(1);
  return Response.json({ announcement: row[0] || null });
}
