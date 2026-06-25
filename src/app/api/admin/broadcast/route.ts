import { getSettings } from "@/game/settings";
import { db } from "@/db";
import { players, announcements } from "@/db/schema";
import { sendMessage } from "@/game/telegram";
import { eq, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ارسال پیام (همگانی یا خصوصی) با قابلیت تنظیم کانال
export async function POST(req: Request) {
  const s = await getSettings();
  if (req.headers.get("x-admin-pass") !== s.adminPassword) {
    return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const targetType = String(body.targetType || "all").trim(); // all | specific
  const targetPlayerId = body.targetPlayerId ? Number(body.targetPlayerId) : null;
  const channel = String(body.channel || "site").trim(); // site | telegram | both
  const dismissible = body.dismissible !== false; // پیش‌فرض true

  if (!title || !message) {
    return Response.json({ error: "عنوان و متن پیام الزامی است." }, { status: 400 });
  }

  if (targetType === "specific" && !targetPlayerId) {
    return Response.json({ error: "برای پیام خصوصی شناسه کاربر الزامی است." }, { status: 400 });
  }

  // ۱. ثبت در جدول اطلاعیه‌ها (اگه قراره توی سایت هم نشون داده بشه)
  if (channel === "site" || channel === "both") {
    await db.insert(announcements).values({
      title,
      message,
      targetType: targetType as "all" | "specific",
      targetPlayerId,
      channel: channel as "site" | "telegram" | "both",
      dismissible,
      active: true,
    });
  }

  // ۲. ارسال به تلگرام (اگه کانال telegram یا both باشه)
  let sentCount = 0;
  if (channel === "telegram" || channel === "both") {
    let targets: { telegramId: string | null }[] = [];

    if (targetType === "specific" && targetPlayerId) {
      const pl = await db
        .select({ telegramId: players.telegramId })
        .from(players)
        .where(eq(players.id, targetPlayerId))
        .limit(1);
      targets = pl;
    } else {
      targets = await db
        .select({ telegramId: players.telegramId })
        .from(players)
        .where(isNotNull(players.telegramId));
    }

    for (const p of targets) {
      if (p.telegramId) {
        try {
          await sendMessage(p.telegramId, `📢 <b>${title}</b>\n\n${message}`);
          sentCount++;
        } catch (e) {
          console.error(`Failed to send to ${p.telegramId}`, e);
        }
      }
    }
  }

  return Response.json({ ok: true, sentCount });
}
